from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import Conversation, MemorySummary, Message, User
from app.schemas.chat import (
    ConversationCreate,
    ConversationList,
    ConversationOut,
    MessageCreate,
    MessageFeedback,
    MessageList,
    MessageOut,
    SendResult,
)
from app.services.ai_service import generate_reply, generate_summary

router = APIRouter(prefix="/chat", tags=["chat"])

SUMMARY_EVERY = 6
MEMORY_LIMIT = 5


def _get_conversation(conversation_id: int, user_id: int, db: Session) -> Conversation:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
        .first()
    )
    if conv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found."
        )
    return conv


def _build_memory_context(user_id: int, db: Session) -> str:
    """Recall the most recent long-term-memory summaries for this user."""
    items = (
        db.query(MemorySummary)
        .filter(MemorySummary.user_id == user_id)
        .order_by(MemorySummary.updated_at.desc())
        .limit(MEMORY_LIMIT)
        .all()
    )
    return "\n".join(f"- {s.content}" for s in items)


def _refresh_memory_summary(
    conversation_id: int, user_id: int, history: list[dict], db: Session
) -> None:
    """Summarize older conversations into long-term memory (every SUMMARY_EVERY messages)."""
    try:
        count = (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .count()
        )
        if count < SUMMARY_EVERY:
            return
        summary = (
            db.query(MemorySummary)
            .filter(
                MemorySummary.conversation_id == conversation_id,
                MemorySummary.user_id == user_id,
            )
            .first()
        )
        if summary is not None and count % SUMMARY_EVERY != 0:
            return
        text = generate_summary(history)
        if not text:
            return
        if summary is None:
            db.add(
                MemorySummary(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    content=text,
                )
            )
        else:
            summary.content = text
        db.commit()
    except Exception:
        db.rollback()


@router.get("/sessions", response_model=ConversationList)
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return ConversationList(items=items)


@router.post("/sessions", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = Conversation(
        user_id=current_user.id,
        session_title=payload.title or "New Chat",
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("/sessions/{conversation_id}/messages", response_model=MessageList)
def list_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_conversation(conversation_id, current_user.id, db)
    items = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return MessageList(items=items)


@router.delete("/sessions/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = _get_conversation(conversation_id, current_user.id, db)
    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    db.delete(conv)
    db.commit()


@router.post("/messages/{message_id}/feedback", response_model=MessageOut)
def set_feedback(
    message_id: int,
    payload: MessageFeedback,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = (
        db.query(Message)
        .filter(Message.id == message_id, Message.user_id == current_user.id)
        .first()
    )
    if msg is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Message not found."
        )
    msg.helpful = payload.helpful
    db.commit()
    db.refresh(msg)
    return msg


@router.post("/sessions/{conversation_id}/messages", response_model=SendResult)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = _get_conversation(conversation_id, current_user.id, db)

    user_message = Message(
        conversation_id=conversation_id,
        user_id=current_user.id,
        role="user",
        content=payload.content,
        attachment_name=payload.attachment_name,
        attachment_text=payload.attachment_text,
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    history = []
    for m in (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    ):
        if m.role == "user" and m.attachment_name and m.attachment_text:
            history.append(
                {
                    "role": m.role,
                    "content": (
                        f"[Attachment: {m.attachment_name}]\n{m.attachment_text}\n\n"
                        f"{m.content}"
                    ),
                }
            )
        else:
            history.append({"role": m.role, "content": m.content})

    memory_context = _build_memory_context(current_user.id, db)

    try:
        reply_text = generate_reply(history, memory_context)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {str(exc)}",
        )

    if conv.session_title == "New Chat":
        first_words = payload.content.strip()[:48]
        conv.session_title = first_words + ("..." if len(payload.content) > 48 else "")

    assistant_message = Message(
        conversation_id=conversation_id,
        user_id=current_user.id,
        role="assistant",
        content=reply_text,
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)

    _refresh_memory_summary(
        conversation_id,
        current_user.id,
        history + [{"role": "assistant", "content": reply_text}],
        db,
    )

    return SendResult(user_message=user_message, assistant_message=assistant_message)