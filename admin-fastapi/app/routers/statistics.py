"""仪表盘统计路由，对应 Java StatisticsController。"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.response import R
from app.db.session import get_db
from app.schemas.statistics import (
    StatApiStatsVO, StatErrorTrendVO, StatLoginTrendVO,
    StatOverviewVO, StatRecentLoginVO,
)
from app.services import statistics_service

router = APIRouter(prefix="/api/admin/statistics", tags=["statistics"])


@router.get("/overview", operation_id="getStatOverview", summary="概览统计")
async def get_overview(db: AsyncSession = Depends(get_db)) -> R[StatOverviewVO]:
    return R.ok(data=await statistics_service.get_overview(db))


@router.get("/login-trend", operation_id="getStatLoginTrend", summary="登录趋势")
async def get_login_trend(db: AsyncSession = Depends(get_db)) -> R[list[StatLoginTrendVO]]:
    return R.ok(data=await statistics_service.get_login_trend(db))


@router.get("/api-stats", operation_id="getStatApiStats", summary="API请求统计")
async def get_api_stats(db: AsyncSession = Depends(get_db)) -> R[StatApiStatsVO]:
    return R.ok(data=await statistics_service.get_api_stats(db))


@router.get("/recent-logins", operation_id="getStatRecentLogins", summary="最近登录记录")
async def get_recent_logins(
    limit: int = Query(10),
    db: AsyncSession = Depends(get_db),
) -> R[list[StatRecentLoginVO]]:
    return R.ok(data=await statistics_service.get_recent_logins(db, limit))


@router.get("/error-trend", operation_id="getStatErrorTrend", summary="错误趋势")
async def get_error_trend(db: AsyncSession = Depends(get_db)) -> R[list[StatErrorTrendVO]]:
    return R.ok(data=await statistics_service.get_error_trend(db))
