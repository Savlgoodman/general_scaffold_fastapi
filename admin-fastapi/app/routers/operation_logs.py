"""操作审计日志查询路由，对应 Java OperationLogController。"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.schemas.log import OperationLogVO
from app.services import log_query_service

router = APIRouter(prefix="/api/admin/logs/operation", tags=["log-operation"])


@router.get("", operation_id="listOperationLogs", summary="操作审计日志列表")
async def list_operation_logs(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(10, alias="pageSize"),
    keyword: str | None = Query(None),
    module: str | None = Query(None),
    startTime: datetime | None = Query(None, alias="startTime"),
    endTime: datetime | None = Query(None, alias="endTime"),
    db: AsyncSession = Depends(get_db),
) -> R[PageResult[OperationLogVO]]:
    page = await log_query_service.get_operation_log_page(db, pageNum, pageSize, keyword, module, startTime, endTime)
    return R.ok(data=page)


@router.get("/{id}", operation_id="getOperationLogDetail", summary="操作审计日志详情")
async def get_operation_log_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[OperationLogVO]:
    vo = await log_query_service.get_operation_log_by_id(db, id)
    return R.ok(data=vo)
