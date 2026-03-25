from sqlalchemy import BigInteger, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class AdminApiLog(BaseEntity):
    """API 请求日志，对应 admin_api_log 表"""

    __tablename__ = "admin_api_log"

    user_id: Mapped[int | None] = mapped_column(BigInteger)
    username: Mapped[str | None] = mapped_column(String(64))
    method: Mapped[str | None] = mapped_column(String(16))
    path: Mapped[str | None] = mapped_column(String(512))
    query_params: Mapped[str | None] = mapped_column(Text)
    request_body: Mapped[str | None] = mapped_column(Text)
    response_code: Mapped[int | None] = mapped_column(Integer)
    response_body: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int | None] = mapped_column(BigInteger)
    ip: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(512))


class AdminLoginLog(BaseEntity):
    """登录日志，对应 admin_login_log 表"""

    __tablename__ = "admin_login_log"

    username: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str | None] = mapped_column(String(32))
    ip: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(512))
    message: Mapped[str | None] = mapped_column(String(512))


class AdminOperationLog(BaseEntity):
    """操作审计日志，对应 admin_operation_log 表"""

    __tablename__ = "admin_operation_log"

    user_id: Mapped[int | None] = mapped_column(BigInteger)
    username: Mapped[str | None] = mapped_column(String(64))
    module: Mapped[str | None] = mapped_column(String(64))
    operation: Mapped[str | None] = mapped_column(String(32))
    method_name: Mapped[str | None] = mapped_column(String(128))
    request_params: Mapped[str | None] = mapped_column(Text)
    old_data: Mapped[str | None] = mapped_column(Text)
    new_data: Mapped[str | None] = mapped_column(Text)
    ip: Mapped[str | None] = mapped_column(String(64))


class AdminErrorLog(BaseEntity):
    """系统异常日志，对应 admin_error_log 表"""

    __tablename__ = "admin_error_log"

    level: Mapped[str | None] = mapped_column(String(16))
    exception_class: Mapped[str | None] = mapped_column(String(255))
    exception_message: Mapped[str | None] = mapped_column(String(512))
    stack_trace: Mapped[str | None] = mapped_column(Text)
    request_path: Mapped[str | None] = mapped_column(String(512))
    request_method: Mapped[str | None] = mapped_column(String(16))
    request_params: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[int | None] = mapped_column(BigInteger)
    ip: Mapped[str | None] = mapped_column(String(64))
