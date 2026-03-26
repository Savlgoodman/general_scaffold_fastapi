"""仪表盘统计 Service。"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import cast, Date, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.redis_keys import RedisKeys
from app.db.redis import redis_client
from app.models.logs import AdminApiLog, AdminErrorLog, AdminLoginLog
from app.models.notice import AdminNotice
from app.models.role import AdminRole
from app.models.user import AdminUser
from app.schemas.statistics import (
    SlowEndpointItem,
    StatApiStatsVO,
    StatErrorTrendVO,
    StatLoginTrendVO,
    StatOverviewVO,
    StatRecentLoginVO,
)


async def get_overview(db: AsyncSession) -> StatOverviewVO:
    """仪表盘总览数据。"""

    # 用户
    total_users = (
        await db.execute(
            select(func.count()).where(AdminUser.is_deleted == 0)
        )
    ).scalar_one()

    active_users = (
        await db.execute(
            select(func.count()).where(
                AdminUser.is_deleted == 0, AdminUser.status == 1
            )
        )
    ).scalar_one()

    # 角色
    total_roles = (
        await db.execute(
            select(func.count()).where(AdminRole.is_deleted == 0)
        )
    ).scalar_one()

    # 今日登录
    today_start = datetime.combine(date.today(), datetime.min.time())

    today_login_success = (
        await db.execute(
            select(func.count()).where(
                AdminLoginLog.is_deleted == 0,
                AdminLoginLog.status == "success",
                AdminLoginLog.create_time >= today_start,
            )
        )
    ).scalar_one()

    today_login_failed = (
        await db.execute(
            select(func.count()).where(
                AdminLoginLog.is_deleted == 0,
                AdminLoginLog.status == "failed",
                AdminLoginLog.create_time >= today_start,
            )
        )
    ).scalar_one()

    # 在线用户（Redis）
    online_keys = []
    async for key in redis_client.scan_iter(
        match=RedisKeys.ONLINE_SESSION.key("*"), count=200
    ):
        online_keys.append(key)
    online_users = len(online_keys)

    # 今日异常
    today_errors = (
        await db.execute(
            select(func.count()).where(
                AdminErrorLog.is_deleted == 0,
                AdminErrorLog.create_time >= today_start,
            )
        )
    ).scalar_one()

    # 已发布公告
    published_notices = (
        await db.execute(
            select(func.count()).where(
                AdminNotice.is_deleted == 0,
                AdminNotice.status == "published",
            )
        )
    ).scalar_one()

    return StatOverviewVO(
        total_users=total_users,
        active_users=active_users,
        total_roles=total_roles,
        today_login_success=today_login_success,
        today_login_failed=today_login_failed,
        online_users=online_users,
        today_errors=today_errors,
        published_notices=published_notices,
    )


async def get_login_trend(db: AsyncSession) -> list[StatLoginTrendVO]:
    """最近 7 天登录趋势。"""
    today = date.today()
    start_date = today - timedelta(days=6)
    start_dt = datetime.combine(start_date, datetime.min.time())

    stmt = (
        select(
            cast(AdminLoginLog.create_time, Date).label("log_date"),
            AdminLoginLog.status,
            func.count().label("cnt"),
        )
        .where(
            AdminLoginLog.is_deleted == 0,
            AdminLoginLog.create_time >= start_dt,
        )
        .group_by("log_date", AdminLoginLog.status)
        .order_by("log_date")
    )
    rows = (await db.execute(stmt)).all()

    # 构造 7 天完整数据
    date_map: dict[str, dict[str, int]] = {}
    for i in range(7):
        d = (start_date + timedelta(days=i)).isoformat()
        date_map[d] = {"success": 0, "failed": 0}

    for row in rows:
        d = row.log_date.isoformat() if row.log_date else None
        if d and d in date_map:
            if row.status == "success":
                date_map[d]["success"] = row.cnt
            elif row.status == "failed":
                date_map[d]["failed"] = row.cnt

    return [
        StatLoginTrendVO(
            date=d,
            success_count=v["success"],
            failed_count=v["failed"],
        )
        for d, v in date_map.items()
    ]


async def get_api_stats(db: AsyncSession) -> StatApiStatsVO:
    """今日 API 统计。"""
    today_start = datetime.combine(date.today(), datetime.min.time())

    base = select(AdminApiLog).where(
        AdminApiLog.is_deleted == 0,
        AdminApiLog.create_time >= today_start,
    )

    # 总请求数
    today_total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar_one()

    # 平均响应时间
    avg_resp = (
        await db.execute(
            select(func.avg(AdminApiLog.duration_ms)).where(
                AdminApiLog.is_deleted == 0,
                AdminApiLog.create_time >= today_start,
            )
        )
    ).scalar_one()

    # 错误率
    error_count = (
        await db.execute(
            select(func.count()).where(
                AdminApiLog.is_deleted == 0,
                AdminApiLog.create_time >= today_start,
                AdminApiLog.response_code >= 400,
            )
        )
    ).scalar_one()

    error_rate = round(error_count / today_total * 100, 2) if today_total > 0 else 0.0

    # Top 5 慢接口
    slow_stmt = (
        select(
            AdminApiLog.path,
            AdminApiLog.method,
            func.avg(AdminApiLog.duration_ms).label("avg_dur"),
        )
        .where(
            AdminApiLog.is_deleted == 0,
            AdminApiLog.create_time >= today_start,
        )
        .group_by(AdminApiLog.path, AdminApiLog.method)
        .order_by(func.avg(AdminApiLog.duration_ms).desc())
        .limit(5)
    )
    slow_rows = (await db.execute(slow_stmt)).all()

    slow_endpoints = [
        SlowEndpointItem(
            path=row.path,
            method=row.method,
            avg_duration=round(float(row.avg_dur), 2) if row.avg_dur else 0.0,
        )
        for row in slow_rows
    ]

    return StatApiStatsVO(
        today_total=today_total,
        avg_response_time=round(float(avg_resp), 2) if avg_resp else 0.0,
        error_rate=error_rate,
        slow_endpoints=slow_endpoints,
    )


async def get_recent_logins(
    db: AsyncSession, limit: int = 10
) -> list[StatRecentLoginVO]:
    """最近登录记录。"""
    stmt = (
        select(AdminLoginLog)
        .where(AdminLoginLog.is_deleted == 0)
        .order_by(AdminLoginLog.create_time.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()

    return [
        StatRecentLoginVO(
            username=log.username,
            status=log.status,
            ip=log.ip,
            login_time=log.create_time,
        )
        for log in logs
    ]


async def get_error_trend(db: AsyncSession) -> list[StatErrorTrendVO]:
    """最近 7 天异常趋势。"""
    today = date.today()
    start_date = today - timedelta(days=6)
    start_dt = datetime.combine(start_date, datetime.min.time())

    stmt = (
        select(
            cast(AdminErrorLog.create_time, Date).label("log_date"),
            func.count().label("cnt"),
        )
        .where(
            AdminErrorLog.is_deleted == 0,
            AdminErrorLog.create_time >= start_dt,
        )
        .group_by("log_date")
        .order_by("log_date")
    )
    rows = (await db.execute(stmt)).all()

    # 构造 7 天完整数据
    date_map: dict[str, int] = {}
    for i in range(7):
        d = (start_date + timedelta(days=i)).isoformat()
        date_map[d] = 0

    for row in rows:
        d = row.log_date.isoformat() if row.log_date else None
        if d and d in date_map:
            date_map[d] = row.cnt

    return [StatErrorTrendVO(date=d, count=c) for d, c in date_map.items()]
