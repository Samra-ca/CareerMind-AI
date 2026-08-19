from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
import os

from dotenv import load_dotenv
from app.database import engine

from app.routes import (
    auth,
    profile,
    skills,
    goals,
    stats,
    chat,
    roadmap,
    jobs,
    resume,
    linkedin,
    interview,
    applications,
    achievements,
    salary,
    coverletter,
)

load_dotenv()

app = FastAPI(title="CareerMind.AI API")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(skills.router)
app.include_router(goals.router)
app.include_router(stats.router)
app.include_router(chat.router)
app.include_router(roadmap.router)
app.include_router(jobs.router)
app.include_router(resume.router)
app.include_router(linkedin.router)
app.include_router(interview.router)
app.include_router(applications.router)
app.include_router(achievements.router)
app.include_router(salary.router)
app.include_router(coverletter.router)


@app.on_event("startup")
def ensure_db_schema():
    try:
        inspector = inspect(engine)
        if "roadmap_items" in inspector.get_table_names():
            columns = {c["name"] for c in inspector.get_columns("roadmap_items")}
            if "tasks" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE roadmap_items ADD COLUMN tasks JSONB"))
        if "mock_interviews" in inspector.get_table_names():
            columns = {c["name"] for c in inspector.get_columns("mock_interviews")}
            if "interview_type" not in columns:
                with engine.begin() as conn:
                    conn.execute(
                        text("ALTER TABLE mock_interviews ADD COLUMN interview_type VARCHAR(50)")
                    )
        if "linkedin_analysis" not in inspector.get_table_names():
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "CREATE TABLE linkedin_analysis ("
                        "id BIGSERIAL PRIMARY KEY, "
                        "user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
                        "source_name VARCHAR(255), "
                        "profile_text TEXT, "
                        "completeness_score INTEGER DEFAULT 0, "
                        "summary TEXT, "
                        "missing_sections JSONB, "
                        "present_sections JSONB, "
                        "headline_suggestions JSONB, "
                        "keyword_improvements JSONB, "
                        "strengths JSONB, "
                        "extracted_text TEXT, "
                        "created_at TIMESTAMPTZ DEFAULT NOW(), "
                        "updated_at TIMESTAMPTZ DEFAULT NOW())"
                    )
                )
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_linkedin_analysis_user_id ON linkedin_analysis(user_id)"
                    )
                )
    except Exception:
        pass


@app.get("/")
def root():
    return {"message": "CareerMind.AI API is running"}