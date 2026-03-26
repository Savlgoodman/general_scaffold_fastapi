"""API 日志查询路由，对应 Java ApiLogController。"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.schemas.log import ApiLogVO
from app.services import log_query_service

router = APIRouter(prefix="/api/admin/logs/api", tags=["log-api"])


@router.get("", operation_id="listApiLogs", summary="API 日志列表")
async def list_api_logs(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(10, alias="pageSize"),
    keyword: str | None = Query(None),
    method: str | None = Query(None),
    startTime: datetime | None = Query(None, alias="startTime"),
    endTime: datetime | None = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
) -> R[PageResult[ApiLogVO]]:
    page = await log_query_service.get_api_log_page(db, pageNum, pageSize, keyword, method, startTime, endTime)
    return R.ok(data=page)


@router.get("/{id}", operation_id="getApiLogDetail", summary="API 日志详情")
async def get_api_log_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[ApiLogVO]:
    vo = await log_query_service.get_api_log_by_id(db, id)
    return R.ok(data=vo)
