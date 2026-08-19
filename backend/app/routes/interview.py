from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import MockInterview, MockInterviewAnswer, User
from app.schemas.interview import (
    BetterAnswerOut,
    InterviewGenerateOut,
    InterviewGenerateRequest,
    InterviewSubmitOut,
    InterviewSubmitRequest,
    MockInterviewAnswerOut,
    MockInterviewDetailOut,
    MockInterviewList,
    MockInterviewOut,
)
from app.services.ai_service import (
    evaluate_interview_answers,
    generate_better_answers,
    generate_interview_questions,
)

router = APIRouter(prefix="/interview", tags=["interview"])


def _get_interview(interview_id: int, user_id: int, db: Session) -> MockInterview:
    interview = (
        db.query(MockInterview)
        .filter(MockInterview.id == interview_id, MockInterview.user_id == user_id)
        .first()
    )
    if interview is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    return interview


@router.post("/generate", response_model=InterviewGenerateOut, status_code=status.HTTP_201_CREATED)
def generate_interview(
    payload: InterviewGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        questions = generate_interview_questions(
            payload.role,
            payload.interview_type,
            payload.question_count,
            payload.difficulty,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI question generation failed: {str(exc)}",
        )
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned no interview questions.",
        )

    interview = MockInterview(
        user_id=current_user.id,
        role=payload.role,
        difficulty=payload.difficulty,
        interview_type=payload.interview_type,
        questions=questions,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)

    return InterviewGenerateOut(
        id=interview.id,
        role=interview.role,
        interview_type=interview.interview_type or payload.interview_type,
        difficulty=interview.difficulty or payload.difficulty,
        questions=questions,
    )


@router.post("/{interview_id}/submit", response_model=InterviewSubmitOut)
def submit_answers(
    interview_id: int,
    payload: InterviewSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_interview(interview_id, current_user.id, db)
    if not interview.questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="This interview has no questions."
        )

    qa = [{"question": a.question, "answer": a.answer} for a in payload.answers]
    try:
        result = evaluate_interview_answers(interview.role, qa)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI answer evaluation failed: {str(exc)}",
        )

    db.query(MockInterviewAnswer).filter(
        MockInterviewAnswer.interview_id == interview_id
    ).delete()

    total = 0
    for a in result["answers"]:
        db.add(
            MockInterviewAnswer(
                interview_id=interview_id,
                question=a["question"],
                answer=next((x["answer"] for x in qa if x["question"] == a["question"]), None),
                score=a["score"],
                feedback=a["feedback"],
            )
        )
        total += a["score"]

    evaluated = result["answers"]
    overall = round(total / len(evaluated)) if evaluated else 0
    interview.score = float(overall)
    interview.feedback = result["overall_feedback"] or f"Average score: {overall}/100"
    db.commit()
    db.refresh(interview)

    return InterviewSubmitOut(
        interview_id=interview.id,
        overall_score=overall,
        overall_feedback=interview.feedback,
        answers=[
            {
                "question": a["question"],
                "score": a["score"],
                "feedback": a["feedback"],
            }
            for a in evaluated
        ],
    )


@router.get("/history", response_model=MockInterviewList)
def list_interviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(MockInterview)
        .filter(MockInterview.user_id == current_user.id)
        .order_by(MockInterview.created_at.desc())
        .all()
    )
    return MockInterviewList(items=items)


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_interview(interview_id, current_user.id, db)
    db.delete(interview)
    db.commit()


@router.get("/{interview_id}", response_model=MockInterviewDetailOut)
def get_interview(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_interview(interview_id, current_user.id, db)
    answers = (
        db.query(MockInterviewAnswer)
        .filter(MockInterviewAnswer.interview_id == interview_id)
        .order_by(MockInterviewAnswer.id.asc())
        .all()
    )
    return MockInterviewDetailOut(
        id=interview.id,
        role=interview.role,
        difficulty=interview.difficulty,
        interview_type=interview.interview_type,
        questions=interview.questions,
        score=interview.score,
        feedback=interview.feedback,
        created_at=interview.created_at,
        answers=[
            MockInterviewAnswerOut(
                id=a.id,
                question=a.question,
                answer=a.answer,
                score=a.score,
                feedback=a.feedback,
            )
            for a in answers
        ],
    )


@router.post("/{interview_id}/better-answers", response_model=list[BetterAnswerOut])
def get_better_answers(
    interview_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    interview = _get_interview(interview_id, current_user.id, db)
    questions = [q for q in (interview.questions or []) if str(q).strip()]
    if not questions:
        return []

    answers_map = {
        str(a.question): (a.answer or "") for a in db.query(MockInterviewAnswer).filter(
            MockInterviewAnswer.interview_id == interview_id
        ).all()
    }
    qa = [
        {"question": q, "answer": answers_map.get(str(q), "")}
        for q in questions
    ]
    try:
        result = generate_better_answers(interview.role, qa)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI better-answer generation failed: {str(exc)}",
        )
    return result
