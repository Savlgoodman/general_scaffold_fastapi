"""在线用户相关 Schema。"""

from __future__ import annotations

from datetime import datetime

from app.schemas.base import CamelModel


class OnlineUserVO(CamelModel):
    user_id: int | None = None
    username: str | None = None
    nickname: str | None = None
    avatar: str | None = None
    login_ip: str | None = None
    user_agent: str | None = None
    login_time: datetime | None = None
    last_active_time: datetime | None = None
