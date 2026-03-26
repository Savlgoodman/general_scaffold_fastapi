"""异常日志查询路由，对应 Java ErrorLogController。"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.schemas.log import ErrorLogVO
from app.services import log_query_service

router = APIRouter(prefix="/api/admin/logs/error", tags=["log-error"])


@router.get("", operation_id="listErrorLogs", summary="异常日志列表")
async def list_error_logs(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(10, alias="pageSize"),
    keyword: str | None = Query(None),
    level: str | None = Query(None),
    startTime: datetime | None = Query(None, alias="startTime"),
    endTime: datetime | None = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
) -> R[PageResult[ErrorLogVO]]:
    page = await log_query_service.get_error_log_page(db, pageNum, pageSize, keyword, level, startTime, endTime)
    return R.ok(data=page)


@router.get("/{id}", operation_id="getErrorLogDetail", summary="异常日志详情")
async def get_error_log_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[ErrorLogVO]:
    vo = await log_query_service.get_error_log_by_id(db, id)
    return R.ok(data=vo)
