from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

APPLICATION_STATUSES = ("wishlist", "applied", "interview", "offer", "rejected")
PRIORITY_LEVELS = ("low", "medium", "high")


class ApplicationBase(BaseModel):
    company: str = Field(min_length=1, max_length=255)
    role: str = Field(min_length=1, max_length=255)
    url: str | None = Field(default=None, max_length=500)
    status: Literal["wishlist", "applied", "interview", "offer", "rejected"] = "wishlist"
    priority: Literal["low", "medium", "high"] = "medium"
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v and not v.lower().startswith(("http://", "https://")):
                raise ValueError("URL must start with http:// or https://")
        return v


class ApplicationCreate(ApplicationBase):
    applied_date: datetime | None = None


class ApplicationUpdate(BaseModel):
    company: str | None = Field(default=None, min_length=1, max_length=255)
    role: str | None = Field(default=None, min_length=1, max_length=255)
    url: str | None = Field(default=None, max_length=500)
    status: Literal["wishlist", "applied", "interview", "offer", "rejected"] | None = None
    priority: Literal["low", "medium", "high"] | None = None
    applied_date: datetime | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v and not v.lower().startswith(("http://", "https://")):
                raise ValueError("URL must start with http:// or https://")
        return v


class ApplicationStatusUpdate(BaseModel):
    status: Literal["wishlist", "applied", "interview", "offer", "rejected"]


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company: str
    role: str
    url: str | None
    status: str
    priority: str
    applied_date: datetime | None
    notes: str | None
    created_at: datetime


class ApplicationList(BaseModel):
    items: list[ApplicationOut]