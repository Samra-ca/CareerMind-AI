from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class LinkedInAnalyzeRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=15000)


class LinkedInAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_name: str | None = None
    completeness_score: int
    summary: str | None
    missing_sections: list[str]
    present_sections: list[str]
    headline_suggestions: list[str]
    keyword_improvements: list[str]
    strengths: list[str]
    extracted_text: str | None = None
    created_at: datetime


class LinkedInAnalysisList(BaseModel):
    items: list[LinkedInAnalysisOut]