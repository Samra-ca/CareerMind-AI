from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, UserProfile, Skill, Experience, Education
from app.schemas.coverletter import (
    CoverLetterRequest,
    CoverLetterResponse,
    CoverLetterVersion,
)
from app.services.ai_service import generate_cover_letters

router = APIRouter(prefix="/coverletter", tags=["coverletter"])


def _build_context(user: User, db: Session) -> dict:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    skills = [s.name for s in db.query(Skill).filter(Skill.user_id == user.id).all()]
    experience = []
    for e in (
        db.query(Experience)
        .filter(Experience.user_id == user.id)
        .order_by(Experience.start_date.desc())
        .all()
    ):
        line = f"{e.role} at {e.company}"
        if e.description:
            line += f" - {e.description}"
        experience.append(line)
    education = []
    for edu in db.query(Education).filter(Education.user_id == user.id).all():
        degree = " ".join(p for p in [edu.degree, edu.field_of_study] if p)
        line = f"{degree}, {edu.institution}" if degree else edu.institution
        education.append(line)
    return {
        "name": user.name,
        "headline": profile.headline if profile else None,
        "bio": profile.bio if profile else None,
        "skills": skills,
        "experience": experience,
        "education": education,
    }


@router.post("/generate", response_model=CoverLetterResponse)
def generate_cover_letter(
    payload: CoverLetterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    context = _build_context(current_user, db)
    try:
        versions = generate_cover_letters(
            payload.job_posting,
            context,
            count=payload.count,
            tone=payload.tone,
            variation=payload.variation,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {exc}")
    if not versions:
        raise HTTPException(
            status_code=502, detail="AI returned no valid cover letter versions."
        )
    return CoverLetterResponse(
        versions=[
            CoverLetterVersion(tone=v["tone"], content=v["content"]) for v in versions
        ]
    )