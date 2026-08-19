from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import CareerGoal, User
from app.schemas.goal import GoalIn, GoalList, GoalOut

router = APIRouter(prefix="/goals", tags=["goals"])


def _parse_date(value):
    if not value:
        return None
    return datetime.combine(value, datetime.min.time())


def _get_goal(goal_id: int, user_id: int, db: Session) -> CareerGoal:
    goal = db.query(CareerGoal).filter(CareerGoal.id == goal_id, CareerGoal.user_id == user_id).first()
    if goal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
    return goal


def _apply(goal: CareerGoal, payload: GoalIn):
    goal.title = payload.title
    goal.description = payload.description
    goal.target_role = payload.target_role
    goal.industry = payload.industry
    goal.timeline = payload.timeline
    goal.priority = payload.priority
    goal.progress = payload.progress
    goal.target_date = _parse_date(payload.target_date)
    goal.status = payload.status
    return goal


@router.get("", response_model=GoalList)
def list_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(CareerGoal).filter(CareerGoal.user_id == current_user.id).all()
    return GoalList(items=items, total=len(items))


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = CareerGoal(user_id=current_user.id)
    _apply(goal, payload)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: int,
    payload: GoalIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_goal(goal_id, current_user.id, db)
    _apply(goal, payload)
    db.commit()
    db.refresh(goal)
    return goal


@router.patch("/{goal_id}/complete", response_model=GoalOut)
def complete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_goal(goal_id, current_user.id, db)
    goal.status = "completed"
    goal.progress = 100
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_goal(goal_id, current_user.id, db)
    db.delete(goal)
    db.commit()
    return None