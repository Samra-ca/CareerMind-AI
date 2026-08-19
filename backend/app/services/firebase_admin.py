import json
import os

from dotenv import load_dotenv
from firebase_admin import credentials, get_app, initialize_app

load_dotenv()

_APP_NAME = "careermind_admin"


def _load_credentials():
    if os.getenv("FIREBASE_PRIVATE_KEY") and os.getenv("FIREBASE_CLIENT_EMAIL"):
        return credentials.Certificate(
            {
                "type": "service_account",
                "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                "private_key": os.getenv("FIREBASE_PRIVATE_KEY"),
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        )

    service_account_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "serviceAccountKey.json",
    )
    if os.path.exists(service_account_path):
        return credentials.Certificate(service_account_path)

    raise RuntimeError(
        "Firebase Admin credentials not found. Set FIREBASE_PRIVATE_KEY/"
        "FIREBASE_CLIENT_EMAIL in .env or place serviceAccountKey.json in backend/"
    )


try:
    firebase_app = get_app(_APP_NAME)
except ValueError:
    firebase_app = initialize_app(_load_credentials(), name=_APP_NAME)