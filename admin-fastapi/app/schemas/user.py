"""用户管理相关 Schema，对应 Java CreateAdminUserDTO/UpdateAdminUserDTO/AdminUserVO。"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


# ── DTOs ──────────────────────────────────────────────────

class CreateAdminUserDTO(CamelModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    nickname: str | None = Field(None, description="昵称")
    email: str | None = Field(None, description="邮箱")
    phone: str | None = Field(None, description="手机号")
    avatar: str | None = Field(None, description="头像URL")
    is_superuser: int | None = Field(0, description="是否超级管理员：1-是 0-否")
    status: int | None = Field(1, description="状态：1-正常 0-禁用")


class UpdateAdminUserDTO(CamelModel):
    nickname: str | None = Field(None, description="昵称")
    email: str | None = Field(None, description="邮箱")
    phone: str | None = Field(None, description="手机号")
    avatar: str | None = Field(None, description="头像URL")
    is_superuser: int | None = Field(None, description="是否超级管理员")
    status: int | None = Field(None, description="状态")
    password: str | None = Field(None, description="密码（为空则不修改）")


class AssignRolesDTO(CamelModel):
    role_ids: list[int] = Field(..., description="角色ID列表")


# ── VOs ───────────────────────────────────────────────────

class AdminUserVO(CamelModel):
    id: int | None = None
    username: str | None = None
    nickname: str | None = None
    email: str | None = None
    phone: str | None = None
    avatar: str | None = None
    status: int | None = None
    is_superuser: int | None = None
    create_time: datetime | None = None
    update_time: datetime | None = None
