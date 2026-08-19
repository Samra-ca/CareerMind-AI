from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import CareerGoal, Experience, Skill, User, UserProfile
from app.schemas.job import JobRecommendationsOut
from app.services.ai_service import generate_job_recommendations

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/recommendations", response_model=JobRecommendationsOut)
def job_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    )
    skills = db.query(Skill).filter(Skill.user_id == current_user.id).all()
    experiences = db.query(Experience).filter(Experience.user_id == current_user.id).all()
    goal = (
        db.query(CareerGoal)
        .filter(CareerGoal.user_id == current_user.id, CareerGoal.status != "completed")
        .first()
    )

    context = {
        "headline": profile.headline if profile else None,
        "skills": [s.name for s in skills],
        "experience": [x.role for x in experiences if x.role],
        "target_role": goal.target_role if goal else None,
    }

    try:
        jobs = generate_job_recommendations(context)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI job recommendation failed: {str(exc)}",
        )

    return JobRecommendationsOut(jobs=jobs)