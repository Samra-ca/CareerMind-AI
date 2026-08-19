from pydantic import BaseModel


class JobRecommendation(BaseModel):
    title: str
    company: str
    match_score: int
    missing_skills: list[str] = []
    timeline_to_apply: str
    description: str = ""


class JobRecommendationsOut(BaseModel):
    jobs: list[JobRecommendation]