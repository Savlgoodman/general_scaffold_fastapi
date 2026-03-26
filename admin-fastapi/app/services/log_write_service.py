"""异步日志写入服务，对应 Java LogWriteService。

所有写入操作通过 asyncio.create_task() 在后台执行，不阻塞业务。
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.logs import AdminApiLog, AdminErrorLog, AdminLoginLog, AdminOperationLog

logger = logging.getLogger(__name__)

_MAX_BODY_LEN = 65536
_MAX_STACK_LEN = 4000
_MAX_MSG_LEN = 500


async def write_api_log(
    user_id: int | None, username: str | None,
    method: str, path: str, query_params: str | None,
    request_body: str | None, response_code: int | None,
    response_body: str | None, duration_ms: int,
    ip: str, user_agent: str,
) -> None:
    try:
        async with async_session_factory() as db:
            log = AdminApiLog(
                user_id=user_id, username=username,
                method=method, path=path,
                query_params=_truncate(query_params, _MAX_BODY_LEN),
                request_body=_truncate(request_body, _MAX_BODY_LEN),
                response_code=response_code,
                response_body=_truncate(response_body, _MAX_BODY_LEN),
                duration_ms=duration_ms, ip=ip,
                user_agent=_truncate(user_agent, 512),
            )
            db.add(log)
            await db.commit()
    except Exception as e:
        logger.error("写入API日志失败: %s", e)


async def write_error_log(
    level: str, exception_class: str, exception_message: str,
    stack_trace: str, request_path: str, request_method: str,
    request_params: str | None, user_id: int | None, ip: str,
) -> None:
    try:
        async with async_session_factory() as db:
            log = AdminErrorLog(
                level=level,
                exception_class=_truncate(exception_class, 255),
                exception_message=_truncate(exception_message, _MAX_MSG_LEN),
                stack_trace=_truncate(stack_trace, _MAX_STACK_LEN),
                request_path=request_path, request_method=request_method,
                request_params=_truncate(request_params, _MAX_BODY_LEN),
                user_id=user_id, ip=ip,
            )
            db.add(log)
            await db.commit()
    except Exception as e:
        logger.error("写入异常日志失败: %s", e)


async def write_operation_log(
    user_id: int | None, username: str | None,
    module: str, operation: str, method_name: str,
    request_params: str | None, old_data: str | None,
    new_data: str | None, ip: str,
) -> None:
    try:
        async with async_session_factory() as db:
            log = AdminOperationLog(
                user_id=user_id, username=username,
                module=module, operation=operation,
                method_name=method_name,
                request_params=_truncate(request_params, 2000),
                old_data=_truncate(old_data, 2000),
                new_data=_truncate(new_data, 2000),
                ip=ip,
            )
            db.add(log)
            await db.commit()
    except Exception as e:
        logger.error("写入操作日志失败: %s", e)


def _truncate(s: str | None, max_len: int) -> str | None:
    if s is None:
        return None
    return s[:max_len] if len(s) > max_len else s
