"""定时任务相关 Schema。"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


# -- DTOs ------------------------------------------------------------------

class UpdateTaskConfigDTO(CamelModel):
    cron_expression: str | None = Field(None, description="Cron 表达式")
    enabled: int | None = Field(None, description="启用状态：1-启用 0-禁用")
    description: str | None = Field(None, description="任务描述")


# -- VOs -------------------------------------------------------------------

class TaskConfigVO(CamelModel):
    id: int | None = None
    task_name: str | None = None
    task_label: str | None = None
    task_group: str | None = None
    cron_expression: str | None = None
    enabled: int | None = None
    description: str | None = None
    last_run_time: datetime | None = None
    last_run_status: str | None = None
    create_time: datetime | None = None


class TaskLogVO(CamelModel):
    id: int | None = None
    task_name: str | None = None
    task_group: str | None = None
    status: str | None = None
    message: str | None = None
    duration_ms: int | None = None
    detail: str | None = None
    create_time: datetime | None = None
