"""仪表盘统计相关 Schema。"""

from __future__ import annotations

from datetime import datetime

from app.schemas.base import CamelModel


class StatOverviewVO(CamelModel):
    total_users: int = 0
    active_users: int = 0
    total_roles: int = 0
    today_login_success: int = 0
    today_login_failed: int = 0
    online_users: int = 0
    today_errors: int = 0
    published_notices: int = 0


class StatLoginTrendVO(CamelModel):
    date: str | None = None
    success_count: int = 0
    failed_count: int = 0


class SlowEndpointItem(CamelModel):
    path: str | None = None
    method: str | None = None
    avg_duration: float | None = None


class StatApiStatsVO(CamelModel):
    today_total: int = 0
    avg_response_time: float = 0.0
    error_rate: float = 0.0
    slow_endpoints: list[SlowEndpointItem] = []


class StatRecentLoginVO(CamelModel):
    username: str | None = None
    status: str | None = None
    ip: str | None = None
    login_time: datetime | None = None


class StatErrorTrendVO(CamelModel):
    date: str | None = None
    count: int = 0
