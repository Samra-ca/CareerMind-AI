from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.models import User
from app.schemas.salary import SalaryInsightOut, SalaryRequest
from app.services.ai_service import generate_salary_insights

router = APIRouter(prefix="/salary", tags=["salary"])


@router.post("/insights", response_model=SalaryInsightOut)
def salary_insights(
    payload: SalaryRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        result = generate_salary_insights(payload.role, payload.location)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI salary insights failed: {str(exc)}",
        )
    return result
