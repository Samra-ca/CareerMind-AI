from datetime import datetime, timedelta, timezone

import httpx
import os
from dotenv import load_dotenv
from jose import JWTError, jwt

from firebase_admin import auth as firebase_auth

from app.services.firebase_admin import firebase_app

load_dotenv()

FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

_FIREBASE_SIGN_IN_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"


def create_firebase_user(email: str, password: str, name: str) -> dict:
    record = firebase_auth.create_user(
        app=firebase_app, email=email, password=password, display_name=name
    )
    return {"uid": record.uid, "email": record.email, "name": record.display_name}


def verify_google_id_token(id_token: str) -> dict:
    """Verify a Google ID token issued to the Firebase app. Return user info."""
    try:
        decoded = firebase_auth.verify_id_token(id_token, app=firebase_app)
    except Exception as exc:
        raise ValueError("Invalid Google token.") from exc
    return {
        "uid": decoded["uid"],
        "email": decoded.get("email", ""),
        "name": decoded.get("name", "") or decoded.get("email", "").split("@")[0],
    }


def firebase_sign_in(email: str, password: str) -> dict:
    """Authenticate against Firebase via REST API, returning the ID token + user."""
    response = httpx.post(
        _FIREBASE_SIGN_IN_URL,
        params={"key": FIREBASE_API_KEY},
        json={"email": email, "password": password, "returnSecureToken": True},
        timeout=15,
    )
    if response.status_code != 200:
        raise ValueError("Invalid email or password.")
    data = response.json()
    return {
        "id_token": data["idToken"],
        "uid": data["localId"],
        "email": data["email"],
        "name": data.get("displayName", data["email"]),
    }


def create_access_token(user_id: int, expires_delta: timedelta | None = None) -> str:
    to_encode = {"sub": str(user_id)}
    if expires_delta is not None:
        to_encode["exp"] = datetime.now(timezone.utc) + expires_delta
    elif ACCESS_TOKEN_EXPIRE_MINUTES > 0:
        to_encode["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    """Return the user id (sub) from a valid JWT, or raise ValueError."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired token.") from exc
    sub = payload.get("sub")
    if sub is None:
        raise ValueError("Invalid token payload.")
    return int(sub)