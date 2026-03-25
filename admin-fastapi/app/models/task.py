from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class AdminTaskConfig(BaseEntity):
    """定时任务配置，对应 admin_task_config 表"""

    __tablename__ = "admin_task_config"

    task_name: Mapped[str] = mapped_column(String(128), nullable=False)
    task_label: Mapped[str | None] = mapped_column(String(128))
    task_group: Mapped[str | None] = mapped_column(String(64))
    cron_expression: Mapped[str | None] = mapped_column(String(64))
    enabled: Mapped[int | None] = mapped_column(Integer, default=1)
    description: Mapped[str | None] = mapped_column(String(255))
    last_run_time: Mapped[datetime | None] = mapped_column(DateTime)
    last_run_status: Mapped[str | None] = mapped_column(String(32))


class AdminTaskLog(BaseEntity):
    """定时任务执行日志，对应 admin_task_log 表"""

    __tablename__ = "admin_task_log"

    task_name: Mapped[str | None] = mapped_column(String(128))
    task_group: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str | None] = mapped_column(String(32))
    message: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int | None] = mapped_column(BigInteger)
    detail: Mapped[str | None] = mapped_column(Text)
