from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validate_http_url(v: str | None) -> str | None:
    if v is not None:
        v = v.strip()
        if v and not v.lower().startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
    return v


class EducationIn(BaseModel):
    institution: str = Field(min_length=1, max_length=255)
    degree: str | None = Field(default=None, max_length=255)
    field_of_study: str | None = Field(default=None, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = Field(default=None, max_length=2000)


class ExperienceIn(BaseModel):
    company: str = Field(min_length=1, max_length=255)
    role: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    start_date: date | None = None
    end_date: date | None = None
    is_current: bool = False


class EducationOut(EducationIn):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ExperienceOut(ExperienceIn):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ProfileIn(BaseModel):
    headline: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None, max_length=3000)
    location: str | None = Field(default=None, max_length=255)
    github_url: str | None = Field(default=None, max_length=500)
    linkedin_url: str | None = Field(default=None, max_length=500)
    education: list[EducationIn] = []
    experience: list[ExperienceIn] = []

    @field_validator("github_url", "linkedin_url")
    @classmethod
    def validate_urls(cls, v: str | None) -> str | None:
        return _validate_http_url(v)


class ProfileOut(ProfileIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    avatar_url: str | None = None
    resume_url: str | None = None
    education: list[EducationOut] = []
    experience: list[ExperienceOut] = []


class AvatarOut(BaseModel):
    avatar_url: str