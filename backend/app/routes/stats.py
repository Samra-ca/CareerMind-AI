from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import (
    Application,
    CareerGoal,
    Conversation,
    Skill,
    SkillProgress,
    User,
)

router = APIRouter(tags=["stats"])

STATUS_LABELS = {
    "wishlist": "Wishlist",
    "applied": "Applied",
    "interview": "Interview",
    "offer": "Offer",
    "rejected": "Rejected",
}


@router.get("/stats")
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    skills_count = db.query(func.count(Skill.id)).filter(Skill.user_id == current_user.id).scalar() or 0
    goals_count = (
        db.query(func.count(CareerGoal.id)).filter(CareerGoal.user_id == current_user.id).scalar() or 0
    )
    applications_count = (
        db.query(func.count(Application.id)).filter(Application.user_id == current_user.id).scalar() or 0
    )
    active_goals_count = (
        db.query(func.count(CareerGoal.id))
        .filter(CareerGoal.user_id == current_user.id, CareerGoal.status != "completed")
        .scalar() or 0
    )
    return {
        "skills_count": skills_count,
        "goals_count": goals_count,
        "active_goals_count": active_goals_count,
        "applications_count": applications_count,
    }


@router.get("/stats/dashboard")
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = current_user.id

    skills = db.query(Skill).filter(Skill.user_id == user_id).all()
    skill_series = [
        {
            "name": s.name,
            "rating": s.rating,
            "target": 10,
        }
        for s in skills
    ]

    points = [
        {"date": s.created_at.date().isoformat(), "value": min(100, s.rating * 10)}
        for s in skills
    ]
    progress = (
        db.query(SkillProgress)
        .filter(SkillProgress.user_id == user_id)
        .order_by(SkillProgress.created_at.asc())
        .all()
    )
    points += [
        {"date": p.created_at.date().isoformat(), "value": p.progress_score}
        for p in progress
    ]

    by_date = defaultdict(list)
    for pt in points:
        by_date[pt["date"]].append(pt["value"])
    skill_timeline = [
        {"date": d, "value": round(sum(v) / len(v))}
        for d, v in sorted(by_date.items())
    ]

    status_counts = defaultdict(int)
    for status, count in (
        db.query(Application.status, func.count(Application.id))
        .filter(Application.user_id == user_id)
        .group_by(Application.status)
        .all()
    ):
        status_counts[status or "wishlist"] = count
    app_breakdown = [
        {"name": STATUS_LABELS.get(k, k.capitalize()), "value": v, "key": k}
        for k, v in status_counts.items()
    ]

    goals = db.query(CareerGoal).filter(CareerGoal.user_id == user_id).all()
    goal_progress = [
        {
            "id": g.id,
            "title": g.title,
            "target_role": g.target_role,
            "progress": g.progress if g.status != "completed" else 100,
            "status": g.status,
        }
        for g in goals
    ]

    activities = []
    for app in db.query(Application).filter(Application.user_id == user_id).all():
        activities.append(
            {
                "type": "application",
                "text": f"{STATUS_LABELS.get(app.status, app.status)} — {app.role} at {app.company}",
                "at": app.updated_at.isoformat(),
            }
        )
    for s in db.query(Skill).filter(Skill.user_id == user_id).all():
        activities.append(
            {"type": "skill", "text": f"Skill rated {s.rating}/10 — {s.name}", "at": s.updated_at.isoformat()}
        )
    for g in db.query(CareerGoal).filter(CareerGoal.user_id == user_id).all():
        activities.append(
            {"type": "goal", "text": f"Goal {'completed' if g.status == 'completed' else 'updated'} — {g.title}", "at": g.updated_at.isoformat()}
        )
    for c in db.query(Conversation).filter(Conversation.user_id == user_id).all():
        activities.append(
            {"type": "chat", "text": f"AI chat — {c.session_title}", "at": c.updated_at.isoformat()}
        )

    activities.sort(key=lambda a: a["at"], reverse=True)

    return {
        "skill_series": skill_series,
        "skill_timeline": skill_timeline,
        "app_breakdown": app_breakdown,
        "goal_progress": goal_progress,
        "activities": activities[:12],
        "counts": {
            "skills": len(skills),
            "goals": len(goals),
            "applications": sum(status_counts.values()),
            "active_goals": sum(1 for g in goals if g.status != "completed"),
        },
    }
