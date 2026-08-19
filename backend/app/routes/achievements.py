from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User
from app.schemas.achievement import AchievementListOut
from app.services.achievement_service import get_achievements

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("", response_model=AchievementListOut)
def list_achievements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_achievements(current_user.id, db)