import os
import shutil
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, UserProfile, Education, Experience
from app.schemas.profile import AvatarOut, ProfileIn, ProfileOut

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "avatars"
)
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXT_MAP = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}


def _parse_date(value):
    if not value:
        return None
    return datetime.combine(value, datetime.min.time())


def _build(profile, educations, experiences):
    return ProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        headline=profile.headline,
        bio=profile.bio,
        location=profile.location,
        github_url=profile.github_url,
        linkedin_url=profile.linkedin_url,
        avatar_url=profile.avatar_url,
        resume_url=profile.resume_url,
        education=educations,
        experience=experiences,
    )


@router.get("", response_model=ProfileOut)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile is None:
        return ProfileOut(id=0, user_id=current_user.id)
    educations = db.query(Education).filter(Education.user_id == current_user.id).all()
    experiences = db.query(Experience).filter(Experience.user_id == current_user.id).all()
    return _build(profile, educations, experiences)


@router.post("", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def upsert_profile(
    payload: ProfileIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()

    if profile is None:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    profile.headline = payload.headline
    profile.bio = payload.bio
    profile.location = payload.location
    profile.github_url = payload.github_url
    profile.linkedin_url = payload.linkedin_url
    db.flush()

    db.query(Education).filter(Education.user_id == current_user.id).delete()
    db.query(Experience).filter(Experience.user_id == current_user.id).delete()

    for e in payload.education:
        db.add(
            Education(
                user_id=current_user.id,
                institution=e.institution,
                degree=e.degree,
                field_of_study=e.field_of_study,
                start_date=_parse_date(e.start_date),
                end_date=_parse_date(e.end_date),
                description=e.description,
            )
        )
    for x in payload.experience:
        db.add(
            Experience(
                user_id=current_user.id,
                company=x.company,
                role=x.role,
                description=x.description,
                start_date=_parse_date(x.start_date),
                end_date=_parse_date(x.end_date),
                is_current=x.is_current,
            )
        )

    db.commit()
    db.refresh(profile)
    educations = db.query(Education).filter(Education.user_id == current_user.id).all()
    experiences = db.query(Experience).filter(Experience.user_id == current_user.id).all()
    return _build(profile, educations, experiences)


@router.post("/avatar", response_model=AvatarOut)
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG, PNG, WEBP or GIF images are allowed.",
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = EXT_MAP[file.content_type]
    filename = f"user_{current_user.id}{ext}"
    destination = os.path.join(UPLOAD_DIR, filename)

    with open(destination, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile is None:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    profile.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(profile)

    return AvatarOut(avatar_url=profile.avatar_url)