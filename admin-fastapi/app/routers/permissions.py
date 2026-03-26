"""权限管理路由，对应 Java PermissionController。"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.schemas.permission import PermissionBaseVO, PermissionGroupVO
from app.services import permission_service

router = APIRouter(prefix="/api/admin/permissions", tags=["permissions"])


@router.get("", operation_id="listPermissions", summary="权限列表")
async def list_permissions(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(10, alias="pageSize"),
    keyword: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> R[PageResult[PermissionBaseVO]]:
    page = await permission_service.get_permission_page(db, pageNum, pageSize, keyword)
    return R.ok(data=page)


@router.get("/groups", operation_id="getPermissionGroups", summary="权限分组列表")
async def get_permission_groups(db: AsyncSession = Depends(get_db)) -> R[list[PermissionGroupVO]]:
    groups = await permission_service.get_all_grouped_permissions(db)
    return R.ok(data=groups)


@router.get("/{id}", operation_id="getPermissionDetail", summary="权限详情")
async def get_permission_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[PermissionBaseVO]:
    from app.common.exceptions import BusinessException
    from app.common.result_code import ResultCode
    perm = await permission_service.get_permission_by_id(db, id)
    if perm is None:
        raise BusinessException(ResultCode.NOT_FOUND, "权限不存在")
    vo = permission_service.convert_to_base_vo(perm)
    return R.ok(data=vo)
