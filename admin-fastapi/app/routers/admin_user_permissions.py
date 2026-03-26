"""用户权限管理路由，对应 Java AdminUserPermissionController。"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import BusinessException
from app.common.response import R
from app.common.result_code import ResultCode
from app.db.session import get_db
from app.schemas.menu import UserMenuOverviewVO
from app.schemas.permission import UserPermissionOverviewVO
from app.schemas.rbac import SyncUserOverridesDTO
from app.schemas.role import RoleBaseVO
from app.schemas.user import AssignRolesDTO
from app.services import rbac_service, menu_service, user_service

router = APIRouter(prefix="/api/admin/admin-users", tags=["admin-users-permission"])


async def _check_user_exists(db: AsyncSession, user_id: int) -> None:
    user = await user_service.get_user_by_id(db, user_id)
    if user is None:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")


@router.get("/{id}/roles", operation_id="getUserRoles", summary="获取用户角色")
async def get_user_roles(id: int, db: AsyncSession = Depends(get_db)) -> R[list[RoleBaseVO]]:
    await _check_user_exists(db, id)
    roles = await rbac_service.get_user_roles(db, id)
    vos = [RoleBaseVO(id=r.id, name=r.name, code=r.code, description=r.description, status=r.status, sort=r.sort) for r in roles]
    return R.ok(data=vos)


@router.post("/{id}/roles", operation_id="syncUserRoles", summary="同步用户角色")
async def sync_user_roles(id: int, dto: AssignRolesDTO, db: AsyncSession = Depends(get_db)) -> R[None]:
    await _check_user_exists(db, id)
    await rbac_service.sync_user_roles(db, id, dto.role_ids)
    return R.ok()


@router.get("/{id}/menus", operation_id="getUserMenuOverview", summary="用户菜单总览")
async def get_user_menu_overview(id: int, db: AsyncSession = Depends(get_db)) -> R[UserMenuOverviewVO]:
    await _check_user_exists(db, id)
    vo = await menu_service.get_user_menu_overview(db, id)
    return R.ok(data=vo)


@router.get("/{id}/permissions", operation_id="getUserPermissions", summary="用户权限总览")
async def get_user_permissions(id: int, db: AsyncSession = Depends(get_db)) -> R[UserPermissionOverviewVO]:
    await _check_user_exists(db, id)
    vo = await rbac_service.get_user_permission_overview(db, id)
    return R.ok(data=vo)


@router.put("/{id}/permission-overrides", operation_id="syncUserOverrides", summary="同步用户权限覆盖")
async def sync_user_overrides(id: int, dto: SyncUserOverridesDTO, db: AsyncSession = Depends(get_db)) -> R[None]:
    await _check_user_exists(db, id)
    await rbac_service.sync_user_overrides(db, id, dto)
    return R.ok()


@router.delete("/{id}/permission-overrides/{overrideId}", operation_id="removeUserPermissionOverride", summary="删除用户权限覆盖")
async def remove_user_permission_override(id: int, overrideId: int, db: AsyncSession = Depends(get_db)) -> R[None]:
    await rbac_service.remove_user_permission_override(db, id, overrideId)
    return R.ok()


@router.delete("/{id}/permission-overrides", operation_id="clearUserPermissionOverrides", summary="清除用户所有权限覆盖")
async def clear_user_permission_overrides(id: int, db: AsyncSession = Depends(get_db)) -> R[None]:
    await rbac_service.clear_user_permission_overrides(db, id)
    return R.ok()
