"""角色管理相关 Schema，对应 Java CreateRoleDTO/UpdateRoleDTO/RoleBaseVO/RolePermissionFullVO。"""

from __future__ import annotations

from pydantic import Field

from app.schemas.base import CamelModel


# ── DTOs ──────────────────────────────────────────────────

class CreateRoleDTO(CamelModel):
    name: str = Field(..., description="角色名称")
    code: str = Field(..., description="角色编码（唯一）")
    description: str | None = Field(None, description="角色描述")
    status: int | None = Field(1, description="状态：1-启用 0-禁用")
    sort: int | None = Field(0, description="排序")


class UpdateRoleDTO(CamelModel):
    name: str | None = Field(None, description="角色名称")
    description: str | None = Field(None, description="角色描述")
    status: int | None = Field(None, description="状态")
    sort: int | None = Field(None, description="排序")


class SyncRolePermissionsItem(CamelModel):
    permission_id: int = Field(..., description="权限ID")
    effect: str = Field(..., description="GRANT 或 DENY")


class SyncRolePermissionsDTO(CamelModel):
    permissions: list[SyncRolePermissionsItem] = Field(..., description="权限列表")


class SyncRoleMenusDTO(CamelModel):
    menu_ids: list[int] = Field(..., description="菜单ID列表")


# ── VOs ───────────────────────────────────────────────────

class RoleBaseVO(CamelModel):
    id: int | None = None
    name: str | None = None
    code: str | None = None
    description: str | None = None
    status: int | None = None
    sort: int | None = None


# ── RolePermissionFullVO（复杂嵌套结构）────────────────

class RolePermFullPermissionItem(CamelModel):
    id: int | None = None
    name: str | None = None
    code: str | None = None
    path: str | None = None
    method: str | None = None
    assigned: bool = False
    effect: str | None = None
    covered_by_group: bool = False


class RolePermFullGroupSection(CamelModel):
    group_key: str | None = None
    group_name: str | None = None
    group_permission: dict | None = None
    children: list[RolePermFullPermissionItem] = []
    assigned_count: int = 0
    total_count: int = 0


class RolePermFullSummary(CamelModel):
    total_permissions: int = 0
    assigned_count: int = 0
    grant_count: int = 0
    deny_count: int = 0


class RolePermissionFullVO(CamelModel):
    role_id: int | None = None
    role_name: str | None = None
    role_code: str | None = None
    groups: list[RolePermFullGroupSection] = []
    summary: RolePermFullSummary | None = None


# ── RoleMenuVO ────────────────────────────────────────────

class RoleMenuVOItem(CamelModel):
    id: int | None = None
    name: str | None = None
    path: str | None = None
    icon: str | None = None
    type: str | None = None
    assigned: bool = False
    covered_by_directory: bool = False


class RoleMenuVOGroup(CamelModel):
    id: int | None = None
    name: str | None = None
    path: str | None = None
    icon: str | None = None
    type: str | None = None
    assigned: bool = False
    children: list[RoleMenuVOItem] = []
    assigned_count: int = 0
    total_count: int = 0


class RoleMenuVOSummary(CamelModel):
    total_menus: int = 0
    assigned_count: int = 0


class RoleMenuVO(CamelModel):
    role_id: int | None = None
    role_name: str | None = None
    groups: list[RoleMenuVOGroup] = []
    summary: RoleMenuVOSummary | None = None
