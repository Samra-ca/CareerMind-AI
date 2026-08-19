from pydantic import BaseModel, ConfigDict, Field


class SkillIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str | None = None
    rating: int = Field(default=5, ge=1, le=10)
    years_of_experience: float | None = Field(default=None, ge=0, le=60)


class SkillOut(SkillIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int


class SkillList(BaseModel):
    items: list[SkillOut]
    total: int


class SkillGapRequest(BaseModel):
    target_role: str = Field(min_length=2, max_length=255)


class SkillGapResult(BaseModel):
    role: str
    required_skills: list[str] = []
    missing_skills: list[str] = []
    matched_skills: list[str] = []
    recommendations: list[str] = []
    overall_readiness: int = 0