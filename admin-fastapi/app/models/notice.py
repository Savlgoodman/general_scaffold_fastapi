from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class AdminNotice(BaseEntity):
    """通知公告，对应 admin_notice 表"""

    __tablename__ = "admin_notice"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[str | None] = mapped_column(String(32), default="draft")
    is_top: Mapped[int | None] = mapped_column(Integer, default=0)
    publish_time: Mapped[datetime | None] = mapped_column(DateTime)
    publisher_id: Mapped[int | None] = mapped_column(BigInteger)
    publisher_name: Mapped[str | None] = mapped_column(String(64))
