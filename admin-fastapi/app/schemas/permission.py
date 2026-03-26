"""权限管理相关 Schema，对应 Java PermissionBaseVO/PermissionGroupVO/UserPermissionOverviewVO。"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel
from app.schemas.role import RoleBaseVO


# ── VOs ───────────────────────────────────────────────────

class PermissionBaseVO(CamelModel):
    id: int | None = None
    name: str | None = None
    code: str | None = None
    path: str | None = None
    method: str | None = None
    is_group: int | None = None
    group_key: str | None = None
    group_name: str | None = None
    description: str | None = None
    status: int | None = None
    sort: int | None = None


class PermissionGroupVO(CamelModel):
    group_key: str | None = None
    group_name: str | None = None
    group_permission: PermissionBaseVO | None = None
    children: list[PermissionBaseVO] = []
    total_count: int = 0


# ── UserPermissionOverviewVO（复杂嵌套结构）────────────

class UserPermPermissionRow(CamelModel):
    permission_id: int | None = None
    name: str | None = None
    path: str | None = None
    method: str | None = None
    is_group: int | None = None
    final_effect: str | None = None
    source: str | None = None
    source_roles: list[str] = []
    has_override: bool = False
    override_id: int | None = None
    override_effect: str | None = None
    covered_by_group: bool = False


class UserPermGroupSection(CamelModel):
    group_key: str | None = None
    group_name: str | None = None
    children: list[UserPermPermissionRow] = []


class UserPermOverrideItem(CamelModel):
    override_id: int | None = None
    permission_id: int | None = None
    permission_name: str | None = None
    path: str | None = None
    method: str | None = None
    effect: str | None = None
    create_time: datetime | None = None


class UserPermSummary(CamelModel):
    total_permissions: int = 0
    granted_count: int = 0
    denied_count: int = 0
    unassigned_count: int = 0
    override_count: int = 0


class UserPermissionOverviewVO(CamelModel):
    user_id: int | None = None
    username: str | None = None
    is_superuser: int | None = None
    roles: list[RoleBaseVO] = []
    groups: list[UserPermGroupSection] = []
    overrides: list[UserPermOverrideItem] = []
    summary: UserPermSummary | None = None
