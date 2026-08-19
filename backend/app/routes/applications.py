from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Application, User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationList,
    ApplicationOut,
    ApplicationStatusUpdate,
    ApplicationUpdate,
)

router = APIRouter(prefix="/applications", tags=["applications"])

VALID_STATUSES = {"wishlist", "applied", "interview", "offer", "rejected"}
VALID_PRIORITIES = {"low", "medium", "high"}


def _get_application(app_id: int, user_id: int, db: Session) -> Application:
    app = (
        db.query(Application)
        .filter(Application.id == app_id, Application.user_id == user_id)
        .first()
    )
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found."
        )
    return app


def _check_status(status_value: str):
    if status_value not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )


def _check_priority(priority_value: str):
    if priority_value not in VALID_PRIORITIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid priority. Must be one of: low, medium, high",
        )


@router.get("", response_model=ApplicationList)
def list_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
        .all()
    )
    return ApplicationList(items=items)


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_status(payload.status)
    _check_priority(payload.priority)
    app = Application(
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        url=payload.url,
        status=payload.status,
        priority=payload.priority,
        applied_date=payload.applied_date,
        notes=payload.notes,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.put("/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: int,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _get_application(app_id, current_user.id, db)
    if payload.status is not None:
        _check_status(payload.status)
    if payload.priority is not None:
        _check_priority(payload.priority)

    for field in ("company", "role", "url", "status", "priority", "applied_date", "notes"):
        value = getattr(payload, field)
        if value is not None:
            setattr(app, field, value)
    db.commit()
    db.refresh(app)
    return app


@router.patch("/{app_id}/status", response_model=ApplicationOut)
def update_application_status(
    app_id: int,
    payload: ApplicationStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _get_application(app_id, current_user.id, db)
    _check_status(payload.status)
    app.status = payload.status
    db.commit()
    db.refresh(app)
    return app


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _get_application(app_id, current_user.id, db)
    db.delete(app)
    db.commit()
    return None
