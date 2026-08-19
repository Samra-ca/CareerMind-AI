from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Roadmap, RoadmapItem, User
from app.schemas.roadmap import (
    RoadmapItemCreate,
    RoadmapItemOut,
    RoadmapItemUpdate,
    RoadmapOut,
    RoadmapRequest,
)
from app.services.ai_service import generate_roadmap

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


def _get_roadmap(roadmap_id: int, user_id: int, db: Session) -> Roadmap:
    roadmap = (
        db.query(Roadmap).filter(Roadmap.id == roadmap_id, Roadmap.user_id == user_id).first()
    )
    if roadmap is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found.")
    return roadmap


@router.get("/latest", response_model=RoadmapOut)
def get_latest_roadmap(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roadmap = (
        db.query(Roadmap)
        .filter(Roadmap.user_id == current_user.id)
        .order_by(Roadmap.created_at.desc())
        .first()
    )
    if roadmap is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No roadmap yet.")
    return roadmap


@router.post("/generate", response_model=RoadmapOut, status_code=status.HTTP_201_CREATED)
def generate_roadmap_endpoint(
    payload: RoadmapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        weeks = generate_roadmap(payload.target_role, payload.duration)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI roadmap generation failed: {str(exc)}",
        )

    if not weeks:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned no roadmap weeks.",
        )

    roadmap = Roadmap(user_id=current_user.id, target_role=payload.target_role, duration=payload.duration)
    for w in weeks:
        roadmap.items.append(
            RoadmapItem(
                week=int(w["week"]),
                title=w["title"],
                description=w["description"],
                tasks=[{"text": t, "done": False} for t in w.get("tasks", [])] or None,
            )
        )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)
    return roadmap


@router.put("/items/{item_id}", response_model=RoadmapItemOut)
def update_roadmap_item(
    item_id: int,
    payload: RoadmapItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(RoadmapItem)
        .join(Roadmap)
        .filter(RoadmapItem.id == item_id, Roadmap.user_id == current_user.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap item not found.")

    if payload.title is not None:
        item.title = payload.title
    if payload.description is not None:
        item.description = payload.description
    if payload.completed is not None:
        item.completed = payload.completed
    if payload.tasks is not None:
        item.tasks = payload.tasks
        if item.tasks:
            item.completed = bool(item.tasks and all(t.get("done", False) for t in item.tasks))
    db.commit()
    db.refresh(item)
    return item


@router.post("/items", response_model=RoadmapItemOut, status_code=status.HTTP_201_CREATED)
def add_roadmap_item(
    payload: RoadmapItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    roadmap = (
        db.query(Roadmap)
        .filter(Roadmap.user_id == current_user.id)
        .order_by(Roadmap.created_at.desc())
        .first()
    )
    if roadmap is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No roadmap yet. Generate a roadmap first.",
        )

    max_week = max((i.week for i in roadmap.items), default=0)
    item = RoadmapItem(
        roadmap_id=roadmap.id,
        week=max_week + 1,
        title=payload.title,
        description=payload.description,
        completed=payload.completed or False,
        tasks=payload.tasks,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item