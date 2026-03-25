from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class AdminFile(BaseEntity):
    """文件记录，对应 admin_file 表"""

    __tablename__ = "admin_file"

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    object_name: Mapped[str] = mapped_column(String(512), nullable=False)
    bucket_name: Mapped[str | None] = mapped_column(String(64))
    url: Mapped[str | None] = mapped_column(String(1024))
    size: Mapped[int | None] = mapped_column(BigInteger)
    content_type: Mapped[str | None] = mapped_column(String(128))
    category: Mapped[str | None] = mapped_column(String(32))
    uploader_id: Mapped[int | None] = mapped_column(BigInteger)
    uploader_name: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str | None] = mapped_column(String(32), default="active")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
