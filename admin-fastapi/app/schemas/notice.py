"""通知公告相关 Schema，对应 Java NoticeDTO/NoticeVO。"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


# -- DTOs ------------------------------------------------------------------

class CreateNoticeDTO(CamelModel):
    title: str = Field(..., description="公告标题")
    content: str | None = Field(None, description="公告内容")
    type: str | None = Field(None, description="公告类型：notice/announcement")


class UpdateNoticeDTO(CamelModel):
    title: str | None = Field(None, description="公告标题")
    content: str | None = Field(None, description="公告内容")
    type: str | None = Field(None, description="公告类型")


# -- VOs -------------------------------------------------------------------

class NoticeVO(CamelModel):
    id: int | None = None
    title: str | None = None
    content: str | None = None
    type: str | None = None
    status: str | None = None
    is_top: int | None = None
    publish_time: datetime | None = None
    publisher_id: int | None = None
    publisher_name: str | None = None
    create_time: datetime | None = None
    update_time: datetime | None = None
