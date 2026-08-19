import os
import shutil
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import LinkedInAnalysis, User
from app.schemas.linkedin import (
    LinkedInAnalysisList,
    LinkedInAnalysisOut,
    LinkedInAnalyzeRequest,
)
from app.services.ai_service import analyze_linkedin

router = APIRouter(prefix="/linkedin", tags=["linkedin"])

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "linkedin"
)

ALLOWED_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
    "text/plain",
}


def _extract_text(path: str, content_type: str) -> str:
    name = path.lower()
    if content_type == "application/pdf" or name.endswith(".pdf"):
        try:
            import pdfplumber

            with pdfplumber.open(path) as pdf:
                pages = [page.extract_text() or "" for page in pdf.pages]
            return "\n\n".join(p.strip() for p in pages if p.strip()).strip()
        except Exception:
            try:
                import PyPDF2

                reader = PyPDF2.PdfReader(path)
                return "\n".join((p.extract_text() or "") for p in reader.pages).strip()
            except Exception:
                return ""

    if content_type in (
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ) or name.endswith(".doc") or name.endswith(".docx"):
        try:
            import docx

            doc = docx.Document(path)
            return "\n".join(p.text for p in doc.paragraphs).strip()
        except Exception:
            return ""

    if content_type == "text/plain" or name.endswith(".txt"):
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                return fh.read().strip()
        except Exception:
            return ""

    return ""


def _analyze(text: str, user_id: int, source_name: str | None, db: Session) -> LinkedInAnalysis:
    if not text or not text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract any text from the file. It may be a scanned image.",
        )
    try:
        result = analyze_linkedin(text)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI LinkedIn analysis failed: {str(exc)}",
        )
    result["extracted_text"] = text[:15000]

    record = LinkedInAnalysis(
        user_id=user_id,
        source_name=source_name,
        profile_text=text[:15000],
        completeness_score=result.get("completeness_score", 0),
        summary=result.get("summary"),
        missing_sections=result.get("missing_sections", []),
        present_sections=result.get("present_sections", []),
        headline_suggestions=result.get("headline_suggestions", []),
        keyword_improvements=result.get("keyword_improvements", []),
        strengths=result.get("strengths", []),
        extracted_text=result.get("extracted_text"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/analyze", response_model=LinkedInAnalysisOut)
def analyze_linkedin_endpoint(
    payload: LinkedInAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _analyze(
        payload.profile_text,
        current_user.id,
        "Pasted profile",
        db,
    )


@router.post("/analyze-file", response_model=LinkedInAnalysisOut)
def analyze_linkedin_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES and not (file.filename or "").lower().endswith(
        (".pdf", ".doc", ".docx", ".txt")
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF, Word (.doc/.docx) or TXT files are allowed.",
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    safe_name = os.path.splitext(os.path.basename(file.filename or "profile"))[0][:60]
    filename = f"linkedin_{current_user.id}_{ts}_{safe_name}"
    destination = os.path.join(UPLOAD_DIR, filename)

    with open(destination, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = _extract_text(destination, file.content_type)
    os.remove(destination)
    return _analyze(text, current_user.id, safe_name, db)


@router.get("/analyses", response_model=LinkedInAnalysisList)
def list_linkedin_analyses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(LinkedInAnalysis)
        .filter(LinkedInAnalysis.user_id == current_user.id)
        .order_by(LinkedInAnalysis.created_at.desc())
        .all()
    )
    return LinkedInAnalysisList(items=items)


@router.delete("/analyses/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_linkedin_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(LinkedInAnalysis)
        .filter(
            LinkedInAnalysis.id == analysis_id,
            LinkedInAnalysis.user_id == current_user.id,
        )
        .first()
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found."
        )
    db.delete(record)
    db.commit()
