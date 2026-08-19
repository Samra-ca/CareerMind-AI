from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import (
    Achievement,
    Application,
    CareerGoal,
    Conversation,
    MockInterview,
    ResumeAnalysis,
    Roadmap,
    Skill,
    User,
    UserProfile,
)

ACHIEVEMENTS = {
    "first_profile": ("🎉", "First Steps", "Create your career profile", lambda m: m["profile_count"] >= 1),
    "first_skill": ("⚡", "First Skill", "Add your first skill", lambda m: m["skill_count"] >= 1),
    "skill_seeker": ("🧰", "Skill Collector", "Add 3 skills", lambda m: m["skill_count"] >= 3),
    "skill_master": ("🏆", "Skill Master", "Rate a skill 10/10", lambda m: m["max_rating"] >= 10),
    "goal_setter": ("🎯", "Goal Setter", "Create your first career goal", lambda m: m["goal_count"] >= 1),
    "first_app": ("📋", "First Application", "Track your first job application", lambda m: m["app_count"] >= 1),
    "app_adventurer": ("🚀", "Job Seeker", "Track 5 job applications", lambda m: m["app_count"] >= 5),
    "interview_done": ("💬", "Interview Practice", "Complete a mock interview", lambda m: m["interview_count"] >= 1),
    "interview_pro": ("🎤", "Interview Pro", "Score 80+ on a mock interview", lambda m: m["best_interview"] >= 80),
    "resume_ready": ("📄", "Resume Builder", "Upload your resume", lambda m: m["resume_count"] >= 1),
    "roadmap": ("🗺️", "Roadmap Explorer", "Generate a career roadmap", lambda m: m["roadmap_count"] >= 1),
    "ai_explorer": ("🤖", "AI Explorer", "Start your first AI chat", lambda m: m["chat_count"] >= 1),
    "streak_3": ("🔥", "3-Day Streak", "Log in 3 days in a row", lambda m: m["streak"] >= 3),
    "streak_7": ("🔥⚡", "7-Day Streak", "Log in 7 days in a row", lambda m: m["streak"] >= 7),
}

PROGRESS_THRESHOLDS = {
    "skill_seeker": ("skill_count", 3),
    "skill_master": ("max_rating", 10),
    "first_app": ("app_count", 1),
    "app_adventurer": ("app_count", 5),
    "interview_pro": ("best_interview", 100),
    "streak_3": ("streak", 3),
    "streak_7": ("streak", 7),
    "first_profile": ("profile_count", 1),
}


def _count(db: Session, model, user_id: int) -> int:
    return db.query(func.count(model.id)).filter(model.user_id == user_id).scalar() or 0


def _metrics(user_id: int, db: Session) -> dict:
    skills = db.query(Skill).filter(Skill.user_id == user_id).all()
    interviews = db.query(MockInterview).filter(MockInterview.user_id == user_id).all()
    user = db.query(User).filter(User.id == user_id).first()
    return {
        "profile_count": _count(db, UserProfile, user_id),
        "skill_count": len(skills),
        "max_rating": max((s.rating or 0 for s in skills), default=0),
        "goal_count": _count(db, CareerGoal, user_id),
        "app_count": _count(db, Application, user_id),
        "interview_count": len(interviews),
        "best_interview": max((m.score or 0 for m in interviews), default=0),
        "resume_count": _count(db, ResumeAnalysis, user_id),
        "roadmap_count": _count(db, Roadmap, user_id),
        "chat_count": _count(db, Conversation, user_id),
        "streak": user.current_streak if user else 0,
    }


def refresh_achievements(user_id: int, db: Session) -> list:
    """Award any newly-unlocked badges and return the list of newly unlocked ones."""
    existing = {
        e.title
        for e in db.query(Achievement).filter(Achievement.user_id == user_id).all()
    }
    m = _metrics(user_id, db)
    newly = []
    now = datetime.utcnow()
    for key, (emoji, title, desc, check) in ACHIEVEMENTS.items():
        if not check(m):
            continue
        if title in existing:
            continue
        db.add(
            Achievement(
                user_id=user_id,
                title=title,
                description=desc,
                badge=emoji,
                earned_at=now,
            )
        )
        newly.append({"key": key, "title": title, "description": desc, "badge": emoji})
    if newly:
        db.commit()
    return newly


def get_achievements(user_id: int, db: Session) -> dict:
    """Build the full achievement list (earned + locked) with progress."""
    newly = refresh_achievements(user_id, db)
    m = _metrics(user_id, db)
    user = db.query(User).filter(User.id == user_id).first()
    earned = {
        e.title: e
        for e in db.query(Achievement).filter(Achievement.user_id == user_id).all()
    }

    achievements = []
    for key, (emoji, title, desc, check) in ACHIEVEMENTS.items():
        ach = earned.get(title)
        if key in PROGRESS_THRESHOLDS:
            metric, maxv = PROGRESS_THRESHOLDS[key]
            cur = min(float(m[metric]), maxv)
            progress = round(cur / maxv * 100)
        else:
            progress = 100 if ach else 0
        achievements.append(
            {
                "key": key,
                "title": title,
                "description": desc,
                "badge": emoji,
                "earned": ach is not None,
                "earned_at": ach.earned_at.isoformat() if ach else None,
                "progress": progress,
            }
        )

    return {
        "streak": user.current_streak or 0 if user else 0,
        "best_streak": user.best_streak or 0 if user else 0,
        "achievements": achievements,
        "newly_awarded": newly,
    }