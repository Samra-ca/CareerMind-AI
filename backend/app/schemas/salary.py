from pydantic import BaseModel, Field


class SalaryRequest(BaseModel):
    role: str = Field(min_length=1, max_length=120)
    location: str = Field(min_length=1, max_length=120)


class SalaryLevel(BaseModel):
    min: int
    max: int
    note: str | None = None


class SalaryInsightOut(BaseModel):
    role: str
    location: str
    currency: str
    junior: SalaryLevel
    mid: SalaryLevel
    senior: SalaryLevel
    market_demand: str
    demand_percent: int
    demand_description: str | None = None
    top_companies: list[str]
    trend_note: str | None = None
