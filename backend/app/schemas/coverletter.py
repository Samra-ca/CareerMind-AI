from pydantic import BaseModel, Field


class CoverLetterRequest(BaseModel):
    job_posting: str = Field(..., min_length=30, max_length=15000)
    count: int = Field(default=3, ge=1, le=3)
    tone: str = Field(default="professional", max_length=100)
    variation: int = Field(default=0, ge=0, le=50)


class CoverLetterVersion(BaseModel):
    tone: str
    content: str


class CoverLetterResponse(BaseModel):
    versions: list[CoverLetterVersion]