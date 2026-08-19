from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ResumeAnalyzeRequest(BaseModel):
    target_role: str = Field(min_length=1, max_length=120)


class ResumeAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str | None
    resume_content: str | None
    analysis_summary: str | None
    strengths: list | None
    improvements: list | None
    missing_keywords: list | None
    score: float | None
    created_at: datetime


class ResumeAnalysisList(BaseModel):
    items: list[ResumeAnalysisOut]
