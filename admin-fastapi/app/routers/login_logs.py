"""登录日志查询路由，对应 Java LoginLogController。"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.schemas.log import LoginLogVO
from app.services import log_query_service

router = APIRouter(prefix="/api/admin/logs/login", tags=["log-login"])


@router.get("", operation_id="listLoginLogs", summary="登录日志列表")
async def list_login_logs(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(10, alias="pageSize"),
    keyword: str | None = Query(None),
    status: str | None = Query(None),
    startTime: datetime | None = Query(None, alias="startTime"),
    endTime: datetime | None = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
) -> R[PageResult[LoginLogVO]]:
    page = await log_query_service.get_login_log_page(db, pageNum, pageSize, keyword, status, startTime, endTime)
    return R.ok(data=page)


@router.get("/{id}", operation_id="getLoginLogDetail", summary="登录日志详情")
async def get_login_log_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[LoginLogVO]:
    vo = await log_query_service.get_login_log_by_id(db, id)
    return R.ok(data=vo)
