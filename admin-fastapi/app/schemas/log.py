"""日志相关 Schema。"""

from __future__ import annotations

from datetime import datetime

from app.schemas.base import CamelModel


class ApiLogVO(CamelModel):
    id: int | None = None
    user_id: int | None = None
    username: str | None = None
    method: str | None = None
    path: str | None = None
    query_params: str | None = None
    request_body: str | None = None
    response_code: int | None = None
    response_body: str | None = None
    duration_ms: int | None = None
    ip: str | None = None
    user_agent: str | None = None
    create_time: datetime | None = None


class LoginLogVO(CamelModel):
    id: int | None = None
    username: str | None = None
    status: str | None = None
    ip: str | None = None
    user_agent: str | None = None
    message: str | None = None
    create_time: datetime | None = None


class OperationLogVO(CamelModel):
    id: int | None = None
    user_id: int | None = None
    username: str | None = None
    module: str | None = None
    operation: str | None = None
    method_name: str | None = None
    request_params: str | None = None
    old_data: str | None = None
    new_data: str | None = None
    ip: str | None = None
    create_time: datetime | None = None


class ErrorLogVO(CamelModel):
    id: int | None = None
    level: str | None = None
    exception_class: str | None = None
    exception_message: str | None = None
    stack_trace: str | None = None
    request_path: str | None = None
    request_method: str | None = None
    request_params: str | None = None
    user_id: int | None = None
    ip: str | None = None
    create_time: datetime | None = None
