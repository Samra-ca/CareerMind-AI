from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class GoalIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    target_role: str | None = None
    industry: str | None = None
    timeline: str | None = None
    priority: str | None = None
    progress: int = Field(default=0, ge=0, le=100)
    target_date: date | None = None
    status: str = Field(default="active")


class GoalOut(GoalIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int


class GoalList(BaseModel):
    items: list[GoalOut]
    total: int