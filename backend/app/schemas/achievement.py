from pydantic import BaseModel


class AchievementItem(BaseModel):
    key: str
    title: str
    description: str
    badge: str
    earned: bool
    earned_at: str | None
    progress: int


class NewAchievement(BaseModel):
    key: str
    title: str
    description: str
    badge: str


class AchievementListOut(BaseModel):
    streak: int
    best_streak: int
    achievements: list[AchievementItem]
    newly_awarded: list[NewAchievement]