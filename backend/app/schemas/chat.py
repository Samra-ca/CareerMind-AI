from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ConversationCreate(BaseModel):
    title: str | None = None


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_title: str | None
    created_at: datetime


class ConversationList(BaseModel):
    items: list[ConversationOut]


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)
    attachment_name: str | None = None
    attachment_text: str | None = Field(default=None, max_length=20000)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    role: str
    content: str
    helpful: bool = False
    attachment_name: str | None = None
    attachment_text: str | None = None
    created_at: datetime


class MessageFeedback(BaseModel):
    helpful: bool


class MessageList(BaseModel):
    items: list[MessageOut]


class SendResult(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut