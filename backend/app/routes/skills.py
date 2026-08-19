from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Skill, SkillProgress, User
from app.schemas.skill import SkillIn, SkillList, SkillGapRequest, SkillGapResult, SkillOut
from app.services.ai_service import generate_skill_gap

router = APIRouter(prefix="/skills", tags=["skills"])


def _get_skill(skill_id: int, user_id: int, db: Session) -> Skill:
    skill = db.query(Skill).filter(Skill.id == skill_id, Skill.user_id == user_id).first()
    if skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found."
        )
    return skill


@router.get("", response_model=SkillList)
def list_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(Skill).filter(Skill.user_id == current_user.id).all()
    return SkillList(items=items, total=len(items))


@router.post("", response_model=SkillOut, status_code=status.HTTP_201_CREATED)
def create_skill(
    payload: SkillIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = Skill(
        user_id=current_user.id,
        name=payload.name,
        category=payload.category,
        rating=payload.rating,
        years_of_experience=payload.years_of_experience,
    )
    db.add(skill)
    db.flush()
    db.add(
        SkillProgress(
            skill_id=skill.id,
            user_id=current_user.id,
            progress_score=payload.rating * 10,
        )
    )
    db.commit()
    db.refresh(skill)
    return skill


@router.put("/{skill_id}", response_model=SkillOut)
def update_skill(
    skill_id: int,
    payload: SkillIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = _get_skill(skill_id, current_user.id, db)
    if skill.rating != payload.rating:
        db.add(
            SkillProgress(
                skill_id=skill.id,
                user_id=current_user.id,
                progress_score=payload.rating * 10,
            )
        )
    skill.name = payload.name
    skill.category = payload.category
    skill.rating = payload.rating
    skill.years_of_experience = payload.years_of_experience
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skill = _get_skill(skill_id, current_user.id, db)
    db.delete(skill)
    db.commit()
    return None


@router.post("/analysis/requirements", response_model=SkillGapResult)
def skill_gap_analysis(
    payload: SkillGapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skills = db.query(Skill).filter(Skill.user_id == current_user.id).all()
    current_skills = [s.name for s in skills]
    try:
        result = generate_skill_gap(payload.target_role, current_skills)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI analysis failed: {str(exc)}",
        )
    return SkillGapResult(**result)