"""用户管理路由，对应 Java AdminUserController。"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.common.response import R
from app.db.session import get_db
from app.decorators.operation_log import log_operation
from app.schemas.user import AdminUserVO, CreateAdminUserDTO, UpdateAdminUserDTO
from app.services import user_service

router = APIRouter(prefix="/api/admin/admin-users", tags=["admin-users"])


@router.get("", operation_id="listUsers", summary="用户列表")
async def list_users(
    pageNum: int = Query(1, alias="pageNum"),
    pageSize: int = Query(10, alias="pageSize"),
    keyword: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> R[PageResult[AdminUserVO]]:
    page = await user_service.get_user_page(db, pageNum, pageSize, keyword)
    return R.ok(data=page)


@router.get("/{id}", operation_id="getUserDetail", summary="用户详情")
async def get_user_detail(id: int, db: AsyncSession = Depends(get_db)) -> R[AdminUserVO]:
    from app.common.exceptions import BusinessException
    from app.common.result_code import ResultCode
    user = await user_service.get_user_by_id(db, id)
    if user is None:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")
    vo = AdminUserVO(
        id=user.id, username=user.username, nickname=user.nickname,
        email=user.email, phone=user.phone, avatar=user.avatar,
        status=user.status, is_superuser=user.is_superuser,
        create_time=user.create_time, update_time=user.update_time,
    )
    return R.ok(data=vo)


@router.post("", operation_id="createUser", summary="创建用户")
async def create_user(dto: CreateAdminUserDTO, request: Request, db: AsyncSession = Depends(get_db)) -> R[AdminUserVO]:
    user = await user_service.create_user(db, dto)
    vo = AdminUserVO(
        id=user.id, username=user.username, nickname=user.nickname,
        email=user.email, phone=user.phone, avatar=user.avatar,
        status=user.status, is_superuser=user.is_superuser,
        create_time=user.create_time, update_time=user.update_time,
    )
    log_operation(request, "用户管理", "CREATE", params=dto, result=vo)
    return R.ok(data=vo)


@router.put("/{id}", operation_id="updateUser", summary="更新用户")
async def update_user(id: int, dto: UpdateAdminUserDTO, request: Request, db: AsyncSession = Depends(get_db)) -> R[AdminUserVO]:
    user = await user_service.update_user(db, id, dto)
    vo = AdminUserVO(
        id=user.id, username=user.username, nickname=user.nickname,
        email=user.email, phone=user.phone, avatar=user.avatar,
        status=user.status, is_superuser=user.is_superuser,
        create_time=user.create_time, update_time=user.update_time,
    )
    log_operation(request, "用户管理", "UPDATE", params=dto, result=vo)
    return R.ok(data=vo)


@router.delete("/{id}", operation_id="deleteUser", summary="删除用户")
async def delete_user(id: int, request: Request, db: AsyncSession = Depends(get_db)) -> R[None]:
    await user_service.delete_user(db, id)
    log_operation(request, "用户管理", "DELETE", description=f"id={id}")
    return R.ok()


@router.delete("", operation_id="deleteUsersBatch", summary="批量删除用户")
async def delete_users_batch(
    request: Request,
    ids: list[int] = Query(...),
    db: AsyncSession = Depends(get_db),
) -> R[None]:
    from app.common.exceptions import BusinessException
    from app.common.result_code import ResultCode
    if not ids:
        raise BusinessException(ResultCode.PARAM_ERROR, "用户ID列表不能为空")
    await user_service.delete_users_batch(db, ids)
    log_operation(request, "用户管理", "DELETE", description=f"批量删除 ids={ids}")
    return R.ok()
