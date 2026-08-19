from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User
from app.schemas.user import (
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserOut,
    GoogleLoginRequest,
)
from app.services.auth import (
    create_access_token,
    firebase_sign_in,
    create_firebase_user,
    verify_google_id_token,
)
from firebase_admin.auth import EmailAlreadyExistsError

router = APIRouter(prefix="/auth", tags=["auth"])


def _authenticate(fb_user: dict, db: Session) -> TokenResponse:
    """Upsert the Firebase user into the local DB, update streak, mint a token."""
    user = db.query(User).filter(User.firebase_uid == fb_user["uid"]).first()
    if user is None:
        user = User(
            firebase_uid=fb_user["uid"],
            email=fb_user["email"],
            name=fb_user["name"],
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    today = date.today()
    if user.last_login_date == today:
        pass
    elif user.last_login_date == today - timedelta(days=1):
        user.current_streak = (user.current_streak or 0) + 1
    else:
        user.current_streak = 1
    user.last_login_date = today
    if (user.current_streak or 0) > (user.best_streak or 0):
        user.best_streak = user.current_streak
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=user)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    try:
        firebase_user = create_firebase_user(
            email=payload.email, password=payload.password, name=payload.name
        )
    except EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists in Firebase.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Firebase account creation failed: {str(exc)}",
        )

    user = User(
        firebase_uid=firebase_user["uid"],
        email=firebase_user["email"],
        name=firebase_user["name"],
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegisterResponse(message="Registration successful", user=user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        fb_user = firebase_sign_in(email=payload.email, password=payload.password)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    return _authenticate(fb_user, db)


@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        fb_user = verify_google_id_token(payload.id_token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed.",
        )
    return _authenticate(fb_user, db)


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user