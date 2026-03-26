"""角色管理路由，对应 Java RoleController。"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.decorators.operation_log import log_operation
from app.schemas.role import (
    CreateRoleDTO, UpdateRoleDTO, RoleBaseVO, RoleMenuVO, RolePermissionFullVO,
    SyncRoleMenusDTO, SyncRolePermissionsDTO,
)
from app.services import role_service, rbac_service, menu_service

router = APIRouter(prefix="/api/admin/roles", tags=["roles"])


@router.get("", operation_id="listRoles", summary="角色列表")
async def list_roles(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(10, alias="pageSize"),
    keyword: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> R[PageResult[RoleBaseVO]]:
    page = await role_service.get_role_page(db, pageNum, pageSize, keyword)
    return R.ok(data=page)


@router.get("/{id}", operation_id="getRoleDetail", summary="角色详情")
async def get_role_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[RoleBaseVO]:
    from app.common.exceptions import BusinessException
    from app.common.result_code import ResultCode
    role = await role_service.get_role_by_id(db, id)
    if role is None:
        raise BusinessException(ResultCode.NOT_FOUND, "角色不存在")
    vo = RoleBaseVO(id=role.id, name=role.name, code=role.code, description=role.description, status=role.status, sort=role.sort)
    return R.ok(data=vo)


@router.post("", operation_id="createRole", summary="创建角色")
async def create_role(dto: CreateRoleDTO, request: Request, db: AsyncSession = Depends(get_db)) -> R[RoleBaseVO]:
    role = await role_service.create_role(db, dto)
    vo = RoleBaseVO(id=role.id, name=role.name, code=role.code, description=role.description, status=role.status, sort=role.sort)
    log_operation(request, "角色管理", "CREATE", params=dto, result=vo)
    return R.ok(data=vo)


@router.put("/{id}", operation_id="updateRole", summary="更新角色")
async def update_role(id: int, dto: UpdateRoleDTO, request: Request, db: AsyncSession = Depends(get_db)) -> R[RoleBaseVO]:
    role = await role_service.update_role(db, id, dto)
    vo = RoleBaseVO(id=role.id, name=role.name, code=role.code, description=role.description, status=role.status, sort=role.sort)
    log_operation(request, "角色管理", "UPDATE", params=dto, result=vo)
    return R.ok(data=vo)


@router.delete("/{id}", operation_id="deleteRole", summary="删除角色")
async def delete_role(id: int, request: Request, db: AsyncSession = Depends(get_db)) -> R[None]:
    await role_service.delete_role(db, id)
    log_operation(request, "角色管理", "DELETE", description=f"id={id}")
    return R.ok()


@router.delete("", operation_id="deleteRolesBatch", summary="批量删除角色")
async def delete_roles_batch(request: Request, ids: list[int] = Query(...), db: AsyncSession = Depends(get_db)) -> R[None]:
    from app.common.exceptions import BusinessException
    from app.common.result_code import ResultCode
    if not ids:
        raise BusinessException(ResultCode.PARAM_ERROR, "角色ID列表不能为空")
    await role_service.delete_roles_batch(db, ids)
    log_operation(request, "角色管理", "DELETE", description=f"批量删除 ids={ids}")
    return R.ok()


@router.get("/{id}/permissions", operation_id="getRolePermissions", summary="角色权限完整视图")
async def get_role_permissions(id: int, db: AsyncSession = Depends(get_db)) -> R[RolePermissionFullVO]:
    from app.common.exceptions import BusinessException
    from app.common.result_code import ResultCode
    vo = await rbac_service.get_role_permissions_full(db, id)
    if vo is None:
        raise BusinessException(ResultCode.NOT_FOUND, "角色不存在")
    return R.ok(data=vo)


@router.put("/{id}/permissions", operation_id="syncRolePermissions", summary="同步角色权限")
async def sync_role_permissions(id: int, dto: SyncRolePermissionsDTO, request: Request, db: AsyncSession = Depends(get_db)) -> R[None]:
    perms = [{"permission_id": p.permission_id, "effect": p.effect} for p in dto.permissions]
    await rbac_service.sync_role_permissions(db, id, perms)
    log_operation(request, "权限管理", "UPDATE", description="同步角色权限", params=dto)
    return R.ok()


@router.get("/{id}/menus", operation_id="getRoleMenus", summary="角色菜单视图")
async def get_role_menus(id: int, db: AsyncSession = Depends(get_db)) -> R[RoleMenuVO]:
    vo = await menu_service.get_role_menus(db, id)
    return R.ok(data=vo)


@router.put("/{id}/menus", operation_id="syncRoleMenus", summary="同步角色菜单")
async def sync_role_menus(id: int, dto: SyncRoleMenusDTO, request: Request, db: AsyncSession = Depends(get_db)) -> R[None]:
    await menu_service.sync_role_menus(db, id, dto.menu_ids)
    log_operation(request, "菜单管理", "UPDATE", description="同步角色菜单", params=dto)
    return R.ok()
