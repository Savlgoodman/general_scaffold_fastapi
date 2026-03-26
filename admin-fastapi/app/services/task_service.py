"""定时任务 Service，对应 Java AdminTaskConfigServiceImpl。"""

from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import BusinessException
from app.common.pagination import PageResult
from app.common.result_code import ResultCode
from app.models.task import AdminTaskConfig, AdminTaskLog
from app.schemas.task import TaskConfigVO, TaskLogVO

logger = logging.getLogger(__name__)


def _config_to_vo(cfg: AdminTaskConfig) -> TaskConfigVO:
    return TaskConfigVO(
        id=cfg.id,
        task_name=cfg.task_name,
        task_label=cfg.task_label,
        task_group=cfg.task_group,
        cron_expression=cfg.cron_expression,
        enabled=cfg.enabled,
        description=cfg.description,
        last_run_time=cfg.last_run_time,
        last_run_status=cfg.last_run_status,
        create_time=cfg.create_time,
    )


def _log_to_vo(log: AdminTaskLog) -> TaskLogVO:
    return TaskLogVO(
        id=log.id,
        task_name=log.task_name,
        task_group=log.task_group,
        status=log.status,
        message=log.message,
        duration_ms=log.duration_ms,
        detail=log.detail,
        create_time=log.create_time,
    )


async def list_task_configs(db: AsyncSession) -> list[TaskConfigVO]:
    """查询所有定时任务配置。"""
    stmt = (
        select(AdminTaskConfig)
        .where(AdminTaskConfig.is_deleted == 0)
        .order_by(AdminTaskConfig.create_time.desc())
    )
    result = await db.execute(stmt)
    configs = result.scalars().all()
    return [_config_to_vo(c) for c in configs]


async def update_task_config(db: AsyncSession, task_id: int, dto) -> None:
    """更新定时任务配置。"""
    stmt = select(AdminTaskConfig).where(
        AdminTaskConfig.id == task_id, AdminTaskConfig.is_deleted == 0
    )
    result = await db.execute(stmt)
    cfg = result.scalars().first()
    if cfg is None:
        raise BusinessException(ResultCode.NOT_FOUND, "任务配置不存在")

    if dto.cron_expression is not None:
        cfg.cron_expression = dto.cron_expression
    if dto.enabled is not None:
        cfg.enabled = dto.enabled
    if dto.description is not None:
        cfg.description = dto.description

    await db.flush()


async def list_task_logs(
    db: AsyncSession,
    page_num: int = 1,
    page_size: int = 10,
    task_name: str | None = None,
    status: str | None = None,
) -> PageResult[TaskLogVO]:
    """分页查询任务执行日志。"""
    base = select(AdminTaskLog).where(AdminTaskLog.is_deleted == 0)

    if task_name:
        base = base.where(AdminTaskLog.task_name.ilike(f"%{task_name}%"))
    if status:
        base = base.where(AdminTaskLog.status == status)

    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    query = (
        base.order_by(AdminTaskLog.create_time.desc())
        .offset((page_num - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    logs = result.scalars().all()

    return PageResult(
        total=total,
        records=[_log_to_vo(lg) for lg in logs],
        current=page_num,
        size=page_size,
    )


async def get_task_log_by_id(db: AsyncSession, log_id: int) -> TaskLogVO | None:
    """根据 ID 获取任务日志。"""
    stmt = select(AdminTaskLog).where(
        AdminTaskLog.id == log_id, AdminTaskLog.is_deleted == 0
    )
    result = await db.execute(stmt)
    log = result.scalars().first()
    return _log_to_vo(log) if log else None


async def run_task_manually(task_name: str) -> None:
    """手动触发任务（占位实现���。"""
    logger.info("手动触发任务: %s（占位���现，暂未接入调度器）", task_name)
