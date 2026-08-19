import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import ResumeAnalysis, User, UserProfile
from app.schemas.resume import ResumeAnalysisList, ResumeAnalysisOut, ResumeAnalyzeRequest
from app.services.ai_service import analyze_resume

router = APIRouter(prefix="/resume", tags=["resume"])

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "resumes"
)


def _extract_pdf_text(path: str) -> str:
    text = ""
    try:
        import pdfplumber

        with pdfplumber.open(path) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        text = "\n\n".join(p.strip() for p in pages if p.strip())
    except Exception:
        text = ""

    if not text.strip():
        try:
            import PyPDF2

            reader = PyPDF2.PdfReader(path)
            text = "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception:
            text = ""
    return text.strip()


@router.post("/upload", response_model=ResumeAnalysisOut, status_code=status.HTTP_201_CREATED)
def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type != "application/pdf" and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed.",
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    safe_name = os.path.splitext(os.path.basename(file.filename or "resume"))[0][:60]
    filename = f"resume_{current_user.id}_{ts}_{safe_name}.pdf"
    destination = os.path.join(UPLOAD_DIR, filename)

    with open(destination, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    content = _extract_pdf_text(destination)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract any text from the PDF. It may be a scanned image.",
        )

    record = ResumeAnalysis(
        user_id=current_user.id,
        filename=filename,
        resume_content=content,
    )
    db.add(record)

    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    )
    if profile is None:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    profile.resume_url = f"/uploads/resumes/{filename}"

    db.commit()
    db.refresh(record)
    return record


@router.post("/{analysis_id}/analyze", response_model=ResumeAnalysisOut)
def analyze_resume_endpoint(
    analysis_id: int,
    payload: ResumeAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(ResumeAnalysis)
        .filter(
            ResumeAnalysis.id == analysis_id,
            ResumeAnalysis.user_id == current_user.id,
        )
        .first()
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Resume analysis not found."
        )
    if not record.resume_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This resume has no extracted text to analyze.",
        )

    try:
        result = analyze_resume(record.resume_content, payload.target_role)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI resume analysis failed: {str(exc)}",
        )

    extra = [f"Keyword coverage: {result['keyword_coverage']}%"]
    if result["matched_keywords"]:
        extra.append(f"Matched keywords: {', '.join(result['matched_keywords'])}")
    if result["formatting_issues"]:
        extra.append(f"Formatting issues: {', '.join(result['formatting_issues'])}")

    record.score = result["ats_score"]
    record.analysis_summary = result["summary"] + "\n\n" + "\n".join(extra)
    record.strengths = result["strengths"]
    record.improvements = result["improvements"]
    record.missing_keywords = result["missing_keywords"]
    db.commit()
    db.refresh(record)
    return record


@router.get("/latest", response_model=ResumeAnalysisOut)
def get_latest_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == current_user.id)
        .order_by(ResumeAnalysis.created_at.desc())
        .first()
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No resume uploaded yet.")
    return record


@router.get("/analyses", response_model=ResumeAnalysisList)
def list_resume_analyses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == current_user.id)
        .order_by(ResumeAnalysis.created_at.desc())
        .all()
    )
    return ResumeAnalysisList(items=items)


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(ResumeAnalysis)
        .filter(
            ResumeAnalysis.id == analysis_id,
            ResumeAnalysis.user_id == current_user.id,
        )
        .first()
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Resume analysis not found."
        )
    if record.filename:
        file_path = os.path.join(UPLOAD_DIR, record.filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
    db.delete(record)
    db.commit()
