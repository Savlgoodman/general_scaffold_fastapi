"""菜单管理相关 Schema，对应 Java CreateMenuDTO/UpdateMenuDTO/MenuVO/SortMenuDTO/UserMenuOverviewVO。"""

from __future__ import annotations

from pydantic import Field

from app.schemas.base import CamelModel
from app.schemas.role import RoleBaseVO


# ── DTOs ──────────────────────────────────────────────────

class CreateMenuDTO(CamelModel):
    name: str = Field(..., description="菜单名称")
    path: str | None = Field(None, description="路由路径")
    icon: str | None = Field(None, description="菜单图标")
    component: str | None = Field(None, description="前端组件路径")
    parent_id: int | None = Field(0, description="父级ID")
    type: str = Field(..., description="菜单类型：directory/menu/button")
    sort: int | None = Field(0, description="排序")


class UpdateMenuDTO(CamelModel):
    name: str | None = Field(None, description="菜单名称")
    path: str | None = Field(None, description="路由路径")
    icon: str | None = Field(None, description="菜单图标")
    component: str | None = Field(None, description="前端组件路径")
    parent_id: int | None = Field(None, description="父级ID")
    type: str | None = Field(None, description="菜单类型")
    sort: int | None = Field(None, description="排序")


class SortMenuDTOItem(CamelModel):
    id: int = Field(..., description="菜单ID")
    sort: int = Field(..., description="排序值")


class SortMenuDTO(CamelModel):
    items: list[SortMenuDTOItem] = Field(..., description="排序项列表")


# ── VOs ───────────────────────────────────────────────────
# MenuVO 已在 auth.py 中定义，此处不重复


# ── UserMenuOverviewVO ────────────────────────────────────

class UserMenuOverviewVOItem(CamelModel):
    id: int | None = None
    name: str | None = None
    path: str | None = None
    icon: str | None = None
    type: str | None = None
    granted: bool = False
    source: str | None = None
    source_roles: list[str] = []
    covered_by_directory: bool = False


class UserMenuOverviewVOGroup(CamelModel):
    id: int | None = None
    name: str | None = None
    path: str | None = None
    icon: str | None = None
    type: str | None = None
    granted: bool = False
    source: str | None = None
    source_roles: list[str] = []
    children: list[UserMenuOverviewVOItem] = []
    granted_count: int = 0
    total_count: int = 0


class UserMenuOverviewVOSummary(CamelModel):
    total_menus: int = 0
    granted_count: int = 0


class UserMenuOverviewVO(CamelModel):
    user_id: int | None = None
    username: str | None = None
    is_superuser: int | None = None
    roles: list[RoleBaseVO] = []
    groups: list[UserMenuOverviewVOGroup] = []
    summary: UserMenuOverviewVOSummary | None = None
