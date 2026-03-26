"""角色管理 Service，对应 Java RoleServiceImpl。"""

from __future__ import annotations

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import BusinessException
from app.common.pagination import PageResult
from app.common.result_code import ResultCode
from app.models.role import AdminRole
from app.schemas.role import CreateRoleDTO, RoleBaseVO, UpdateRoleDTO


def _to_vo(role: AdminRole) -> RoleBaseVO:
    return RoleBaseVO(
        id=role.id,
        name=role.name,
        code=role.code,
        description=role.description,
        status=role.status,
        sort=role.sort,
    )


async def get_role_page(
    db: AsyncSession,
    page_num: int = 1,
    page_size: int = 10,
    keyword: str | None = None,
) -> PageResult[RoleBaseVO]:
    """分页查询角色，支持 name/code 模糊搜索。"""

    base = select(AdminRole).where(AdminRole.is_deleted == 0)

    if keyword:
        like = f"%{keyword}%"
        base = base.where(
            or_(
                AdminRole.name.ilike(like),
                AdminRole.code.ilike(like),
            )
        )

    # total
    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # records
    query = base.order_by(AdminRole.sort.asc()).offset(
        (page_num - 1) * page_size
    ).limit(page_size)
    result = await db.execute(query)
    roles = result.scalars().all()

    return PageResult(
        total=total,
        records=[_to_vo(r) for r in roles],
        current=page_num,
        size=page_size,
    )


async def get_role_by_id(db: AsyncSession, role_id: int) -> AdminRole | None:
    """根据 ID 获取角色（未逻辑删除）。"""
    stmt = select(AdminRole).where(AdminRole.id == role_id, AdminRole.is_deleted == 0)
    result = await db.execute(stmt)
    return result.scalars().first()


async def create_role(db: AsyncSession, dto: CreateRoleDTO) -> AdminRole:
    """创建角色，检查编码唯一性。"""
    exists_stmt = select(func.count()).where(
        AdminRole.code == dto.code,
        AdminRole.is_deleted == 0,
    )
    count = (await db.execute(exists_stmt)).scalar_one()
    if count > 0:
        raise BusinessException(ResultCode.PARAM_ERROR, "角色编码已存在")

    role = AdminRole(
        name=dto.name,
        code=dto.code,
        description=dto.description,
        status=dto.status if dto.status is not None else 1,
        sort=dto.sort if dto.sort is not None else 0,
    )
    db.add(role)
    await db.flush()
    await db.refresh(role)
    return role


async def update_role(
    db: AsyncSession, role_id: int, dto: UpdateRoleDTO
) -> AdminRole:
    """更新角色，仅更新非 None 字段。"""
    role = await get_role_by_id(db, role_id)
    if role is None:
        raise BusinessException(ResultCode.NOT_FOUND, "角色不存在")

    if dto.name is not None:
        role.name = dto.name
    if dto.description is not None:
        role.description = dto.description
    if dto.status is not None:
        role.status = dto.status
    if dto.sort is not None:
        role.sort = dto.sort

    await db.flush()
    await db.refresh(role)
    return role


async def delete_role(db: AsyncSession, role_id: int) -> None:
    """逻辑删除角色。"""
    stmt = (
        update(AdminRole)
        .where(AdminRole.id == role_id, AdminRole.is_deleted == 0)
        .values(is_deleted=1)
    )
    await db.execute(stmt)
    await db.flush()


async def delete_roles_batch(db: AsyncSession, ids: list[int]) -> None:
    """批量逻辑删除角色。"""
    if not ids:
        return
    stmt = (
        update(AdminRole)
        .where(AdminRole.id.in_(ids), AdminRole.is_deleted == 0)
        .values(is_deleted=1)
    )
    await db.execute(stmt)
    await db.flush()
