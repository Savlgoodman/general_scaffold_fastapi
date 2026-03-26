"""RBAC 操作相关 DTO。"""

from pydantic import Field

from app.schemas.base import CamelModel


class SyncUserOverridesItem(CamelModel):
    permission_id: int = Field(..., description="权限ID")
    effect: str = Field(..., description="GRANT 或 DENY")


class SyncUserOverridesDTO(CamelModel):
    overrides: list[SyncUserOverridesItem] = Field(..., description="覆盖列表")
