"""日志查询服务，支持分页 + 多条件过滤。"""

from datetime import datetime

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.models.logs import AdminApiLog, AdminErrorLog, AdminLoginLog, AdminOperationLog
from app.schemas.log import ApiLogVO, ErrorLogVO, LoginLogVO, OperationLogVO


async def get_api_log_page(
    db: AsyncSession, page_num: int, page_size: int,
    keyword: str | None = None, method: str | None = None,
    start_time: datetime | None = None, end_time: datetime | None = None,
) -> PageResult[ApiLogVO]:
    base = select(AdminApiLog).where(AdminApiLog.is_deleted == 0)
    if keyword:
        base = base.where(or_(AdminApiLog.path.ilike(f"%{keyword}%"), AdminApiLog.username.ilike(f"%{keyword}%")))
    if method:
        base = base.where(AdminApiLog.method == method.upper())
    if start_time:
        base = base.where(AdminApiLog.create_time >= start_time)
    if end_time:
        base = base.where(AdminApiLog.create_time <= end_time)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    rows = (await db.execute(base.order_by(AdminApiLog.create_time.desc()).offset((page_num - 1) * page_size).limit(page_size))).scalars().all()

    return PageResult(total=total, current=page_num, size=page_size,
        records=[ApiLogVO(id=r.id, user_id=r.user_id, username=r.username, method=r.method, path=r.path,
            query_params=r.query_params, request_body=r.request_body, response_code=r.response_code,
            duration_ms=r.duration_ms, ip=r.ip, user_agent=r.user_agent, create_time=r.create_time) for r in rows])


async def get_api_log_by_id(db: AsyncSession, log_id: int) -> ApiLogVO | None:
    r = (await db.execute(select(AdminApiLog).where(AdminApiLog.id == log_id, AdminApiLog.is_deleted == 0))).scalar_one_or_none()
    if r is None:
        return None
    return ApiLogVO(id=r.id, user_id=r.user_id, username=r.username, method=r.method, path=r.path,
        query_params=r.query_params, request_body=r.request_body, response_code=r.response_code,
        response_body=r.response_body, duration_ms=r.duration_ms, ip=r.ip, user_agent=r.user_agent, create_time=r.create_time)


async def get_login_log_page(
    db: AsyncSession, page_num: int, page_size: int,
    keyword: str | None = None, status: str | None = None,
    start_time: datetime | None = None, end_time: datetime | None = None,
) -> PageResult[LoginLogVO]:
    base = select(AdminLoginLog).where(AdminLoginLog.is_deleted == 0)
    if keyword:
        base = base.where(AdminLoginLog.username.ilike(f"%{keyword}%"))
    if status:
        base = base.where(AdminLoginLog.status == status)
    if start_time:
        base = base.where(AdminLoginLog.create_time >= start_time)
    if end_time:
        base = base.where(AdminLoginLog.create_time <= end_time)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    rows = (await db.execute(base.order_by(AdminLoginLog.create_time.desc()).offset((page_num - 1) * page_size).limit(page_size))).scalars().all()

    return PageResult(total=total, current=page_num, size=page_size,
        records=[LoginLogVO(id=r.id, username=r.username, status=r.status, ip=r.ip,
            user_agent=r.user_agent, message=r.message, create_time=r.create_time) for r in rows])


async def get_login_log_by_id(db: AsyncSession, log_id: int) -> LoginLogVO | None:
    r = (await db.execute(select(AdminLoginLog).where(AdminLoginLog.id == log_id, AdminLoginLog.is_deleted == 0))).scalar_one_or_none()
    if r is None:
        return None
    return LoginLogVO(id=r.id, username=r.username, status=r.status, ip=r.ip,
        user_agent=r.user_agent, message=r.message, create_time=r.create_time)


async def get_operation_log_page(
    db: AsyncSession, page_num: int, page_size: int,
    keyword: str | None = None, module: str | None = None,
    start_time: datetime | None = None, end_time: datetime | None = None,
) -> PageResult[OperationLogVO]:
    base = select(AdminOperationLog).where(AdminOperationLog.is_deleted == 0)
    if keyword:
        base = base.where(AdminOperationLog.username.ilike(f"%{keyword}%"))
    if module:
        base = base.where(AdminOperationLog.module == module)
    if start_time:
        base = base.where(AdminOperationLog.create_time >= start_time)
    if end_time:
        base = base.where(AdminOperationLog.create_time <= end_time)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    rows = (await db.execute(base.order_by(AdminOperationLog.create_time.desc()).offset((page_num - 1) * page_size).limit(page_size))).scalars().all()

    return PageResult(total=total, current=page_num, size=page_size,
        records=[OperationLogVO(id=r.id, user_id=r.user_id, username=r.username, module=r.module,
            operation=r.operation, method_name=r.method_name, request_params=r.request_params,
            ip=r.ip, create_time=r.create_time) for r in rows])


async def get_operation_log_by_id(db: AsyncSession, log_id: int) -> OperationLogVO | None:
    r = (await db.execute(select(AdminOperationLog).where(AdminOperationLog.id == log_id, AdminOperationLog.is_deleted == 0))).scalar_one_or_none()
    if r is None:
        return None
    return OperationLogVO(id=r.id, user_id=r.user_id, username=r.username, module=r.module,
        operation=r.operation, method_name=r.method_name, request_params=r.request_params,
        old_data=r.old_data, new_data=r.new_data, ip=r.ip, create_time=r.create_time)


async def get_error_log_page(
    db: AsyncSession, page_num: int, page_size: int,
    keyword: str | None = None, level: str | None = None,
    start_time: datetime | None = None, end_time: datetime | None = None,
) -> PageResult[ErrorLogVO]:
    base = select(AdminErrorLog).where(AdminErrorLog.is_deleted == 0)
    if keyword:
        base = base.where(or_(AdminErrorLog.exception_class.ilike(f"%{keyword}%"), AdminErrorLog.request_path.ilike(f"%{keyword}%")))
    if level:
        base = base.where(AdminErrorLog.level == level.upper())
    if start_time:
        base = base.where(AdminErrorLog.create_time >= start_time)
    if end_time:
        base = base.where(AdminErrorLog.create_time <= end_time)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    rows = (await db.execute(base.order_by(AdminErrorLog.create_time.desc()).offset((page_num - 1) * page_size).limit(page_size))).scalars().all()

    return PageResult(total=total, current=page_num, size=page_size,
        records=[ErrorLogVO(id=r.id, level=r.level, exception_class=r.exception_class,
            exception_message=r.exception_message, request_path=r.request_path,
            request_method=r.request_method, user_id=r.user_id, ip=r.ip, create_time=r.create_time) for r in rows])


async def get_error_log_by_id(db: AsyncSession, log_id: int) -> ErrorLogVO | None:
    r = (await db.execute(select(AdminErrorLog).where(AdminErrorLog.id == log_id, AdminErrorLog.is_deleted == 0))).scalar_one_or_none()
    if r is None:
        return None
    return ErrorLogVO(id=r.id, level=r.level, exception_class=r.exception_class,
        exception_message=r.exception_message, stack_trace=r.stack_trace, request_path=r.request_path,
        request_method=r.request_method, request_params=r.request_params,
        user_id=r.user_id, ip=r.ip, create_time=r.create_time)
