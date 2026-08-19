from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class RoadmapItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    week: int
    title: str
    description: str | None
    completed: bool
    tasks: list[dict] | None = None


class RoadmapOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target_role: str
    duration: str
    created_at: datetime
    items: list[RoadmapItemOut] = []


class RoadmapRequest(BaseModel):
    target_role: str = Field(min_length=2, max_length=255)
    duration: str = "3mo"


class RoadmapItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    completed: bool | None = None
    tasks: list[dict] | None = None


class RoadmapItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    completed: bool = False
    tasks: list[dict] | None = None