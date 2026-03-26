"""认证相关 Pydantic 模型，对应 Java dto/LoginDTO, vo/LoginVO 等。"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


# ── Request DTOs ──────────────────────────────────────────

class LoginDTO(CamelModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    captcha_key: str = Field(..., description="验证码key")
    captcha_code: str = Field(..., description="验证码答案")


class RefreshTokenDTO(CamelModel):
    refresh_token: str = Field(..., description="Refresh Token")


# ── Response VOs ──────────────────────────────────────────

class UserVO(CamelModel):
    id: int | None = None
    username: str | None = None
    email: str | None = None
    nickname: str | None = None
    avatar: str | None = None
    status: int | None = None
    is_superuser: int | None = None
    create_time: datetime | None = None


class MenuVO(CamelModel):
    id: int | None = None
    name: str | None = None
    path: str | None = None
    icon: str | None = None
    component: str | None = None
    parent_id: int | None = None
    type: str | None = None
    sort: int | None = None
    children: list[MenuVO] | None = None


class LoginVO(CamelModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "Bearer"
    expires_in: int | None = None
    user: UserVO | None = None
    menus: list[MenuVO] | None = None


class CaptchaVO(CamelModel):
    captcha_key: str | None = None
    captcha_image: str | None = None
    type: str | None = None
