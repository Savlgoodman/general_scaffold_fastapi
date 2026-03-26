"""权限管理 Service，对应 Java PermissionServiceImpl。"""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.pagination import PageResult
from app.models.permission import AdminPermission
from app.schemas.permission import PermissionBaseVO, PermissionGroupVO


def convert_to_base_vo(perm: AdminPermission) -> PermissionBaseVO:
    """将 ORM 模型转换为 PermissionBaseVO。"""
    if perm is None:
        return None  # type: ignore[return-value]
    return PermissionBaseVO(
        id=perm.id,
        name=perm.name,
        code=perm.code,
        path=perm.path,
        method=perm.method,
        is_group=perm.is_group,
        group_key=perm.group_key,
        group_name=perm.group_name,
        description=perm.description,
        status=perm.status,
        sort=perm.sort,
    )


async def get_permission_page(
    db: AsyncSession,
    page_num: int = 1,
    page_size: int = 10,
    keyword: str | None = None,
) -> PageResult[PermissionBaseVO]:
    """分页查询权限，支持 name/code 模糊搜索。"""

    base = select(AdminPermission).where(AdminPermission.is_deleted == 0)

    if keyword:
        like = f"%{keyword}%"
        base = base.where(
            or_(
                AdminPermission.name.ilike(like),
                AdminPermission.code.ilike(like),
            )
        )

    # total
    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # records
    query = base.order_by(AdminPermission.sort.asc()).offset(
        (page_num - 1) * page_size
    ).limit(page_size)
    result = await db.execute(query)
    perms = result.scalars().all()

    return PageResult(
        total=total,
        records=[convert_to_base_vo(p) for p in perms],
        current=page_num,
        size=page_size,
    )


async def get_permission_by_id(
    db: AsyncSession, perm_id: int
) -> AdminPermission | None:
    """根据 ID 获取权限（未逻辑删除）。"""
    stmt = select(AdminPermission).where(
        AdminPermission.id == perm_id, AdminPermission.is_deleted == 0
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def get_active_permissions(db: AsyncSession) -> list[AdminPermission]:
    """获取所有启用且未删除的权限。"""
    stmt = (
        select(AdminPermission)
        .where(AdminPermission.status == 1, AdminPermission.is_deleted == 0)
        .order_by(AdminPermission.sort.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_all_grouped_permissions(
    db: AsyncSession,
) -> list[PermissionGroupVO]:
    """获取所有权限并按 group_key 分组。

    is_group=1 的记录作为分组头，is_group=0 且 group_key 匹配的作为子项。
    """
    stmt = (
        select(AdminPermission)
        .where(AdminPermission.is_deleted == 0)
        .order_by(AdminPermission.sort.asc())
    )
    result = await db.execute(stmt)
    all_perms = list(result.scalars().all())

    # 分离：组头 vs 子项
    group_heads: list[AdminPermission] = []
    children_map: dict[str, list[AdminPermission]] = {}

    for perm in all_perms:
        if perm.is_group is not None and perm.is_group == 1:
            group_heads.append(perm)
        elif perm.group_key is not None:
            children_map.setdefault(perm.group_key, []).append(perm)

    # 构建 PermissionGroupVO 列表
    groups: list[PermissionGroupVO] = []
    for head in group_heads:
        children = children_map.get(head.group_key, [])
        groups.append(
            PermissionGroupVO(
                group_key=head.group_key,
                group_name=head.group_name,
                group_permission=convert_to_base_vo(head),
                children=[convert_to_base_vo(c) for c in children],
                total_count=len(children),
            )
        )

    return groups
