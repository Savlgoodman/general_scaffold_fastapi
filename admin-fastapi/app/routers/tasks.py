"""调度中心路由，对应 Java TaskController。"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.schemas.task import TaskConfigVO, TaskLogVO, UpdateTaskConfigDTO
from app.services import task_service

router = APIRouter(prefix="/api/admin/tasks", tags=["tasks"])


@router.get("/configs", operation_id="listTaskConfigs", summary="任务配置列表")
async def list_task_configs(db: AsyncSession = Depends(get_db)) -> R[list[TaskConfigVO]]:
    configs = await task_service.list_task_configs(db)
    return R.ok(data=configs)


@router.put("/configs/{id}", operation_id="updateTaskConfig", summary="修改任务配置")
async def update_task_config(id: int, dto: UpdateTaskConfigDTO, db: AsyncSession = Depends(get_db)) -> R[None]:
    await task_service.update_task_config(db, id, dto)
    return R.ok()


@router.post("/{taskName}/run", operation_id="runTaskManually", summary="手动触发任务")
async def run_task_manually(taskName: str) -> R[None]:
    await task_service.run_task_manually(taskName)
    return R.ok()


@router.get("/logs", operation_id="listTaskLogs", summary="任务执行日志")
async def list_task_logs(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(20, alias="pageSize"),
    taskName: str | None = Query(None, alias="taskName"),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> R[PageResult[TaskLogVO]]:
    page = await task_service.list_task_logs(db, pageNum, pageSize, taskName, status)
    return R.ok(data=page)


@router.get("/logs/{id}", operation_id="getTaskLogDetail", summary="任务日志详情")
async def get_task_log_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[TaskLogVO]:
    vo = await task_service.get_task_log_by_id(db, id)
    return R.ok(data=vo)
