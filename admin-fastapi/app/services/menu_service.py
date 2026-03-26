"""菜单管理 Service，对应 Java MenuServiceImpl。"""

from __future__ import annotations

from collections import OrderedDict

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import BusinessException
from app.common.result_code import ResultCode
from app.models.associations import AdminRoleMenu, AdminUserRole
from app.models.menu import AdminMenu
from app.models.role import AdminRole
from app.models.user import AdminUser
from app.schemas.auth import MenuVO
from app.schemas.menu import (
    CreateMenuDTO,
    SortMenuDTOItem,
    UpdateMenuDTO,
    UserMenuOverviewVO,
    UserMenuOverviewVOGroup,
    UserMenuOverviewVOItem,
    UserMenuOverviewVOSummary,
)
from app.schemas.role import (
    RoleBaseVO,
    RoleMenuVO,
    RoleMenuVOGroup,
    RoleMenuVOItem,
    RoleMenuVOSummary,
)


# ── helpers ──────────────────────────────────────────────────


def _to_menu_vo(menu: AdminMenu) -> MenuVO:
    return MenuVO(
        id=menu.id,
        name=menu.name,
        path=menu.path,
        icon=menu.icon,
        component=menu.component,
        parent_id=menu.parent_id,
        type=menu.type,
        sort=menu.sort,
    )


def _build_menu_tree(menus: list[AdminMenu]) -> list[MenuVO]:
    """将扁平菜单列表构建为树形结构。"""
    vo_map: OrderedDict[int, MenuVO] = OrderedDict()
    for m in menus:
        vo_map[m.id] = _to_menu_vo(m)

    roots: list[MenuVO] = []
    for vo in vo_map.values():
        if vo.parent_id is None or vo.parent_id == 0:
            roots.append(vo)
        else:
            parent = vo_map.get(vo.parent_id)
            if parent is not None:
                if parent.children is None:
                    parent.children = []
                parent.children.append(vo)
    return roots


# ── public API ───────────────────────────────────────────────


async def get_menu_tree(db: AsyncSession) -> list[MenuVO]:
    """获取全量菜单树。"""
    stmt = (
        select(AdminMenu)
        .where(AdminMenu.is_deleted == 0)
        .order_by(AdminMenu.sort.asc())
    )
    result = await db.execute(stmt)
    all_menus = list(result.scalars().all())
    return _build_menu_tree(all_menus)


async def get_user_menu_tree(db: AsyncSession, user_id: int) -> list[MenuVO]:
    """获取用户可见的菜单树（基于角色）。"""
    # 1. 用户 → 角色 IDs
    ur_stmt = select(AdminUserRole.role_id).where(
        AdminUserRole.user_id == user_id, AdminUserRole.is_deleted == 0
    )
    ur_result = await db.execute(ur_stmt)
    role_ids = list(ur_result.scalars().all())
    if not role_ids:
        return []

    # 2. 角色 → 菜单 IDs
    rm_stmt = select(AdminRoleMenu.menu_id).where(
        AdminRoleMenu.role_id.in_(role_ids), AdminRoleMenu.is_deleted == 0
    )
    rm_result = await db.execute(rm_stmt)
    menu_ids = set(rm_result.scalars().all())
    if not menu_ids:
        return []

    # 3. 查全量菜单用于回溯父级
    m_result = await db.execute(
        select(AdminMenu).where(AdminMenu.is_deleted == 0).order_by(AdminMenu.sort.asc())
    )
    all_db_menus = list(m_result.scalars().all())
    menu_by_id = {m.id: m for m in all_db_menus}

    # 4. 回溯补齐所有祖先菜单，确保树完整
    needed_ids = set(menu_ids)
    for mid in list(menu_ids):
        m = menu_by_id.get(mid)
        while m and m.parent_id and m.parent_id in menu_by_id:
            needed_ids.add(m.parent_id)
            m = menu_by_id.get(m.parent_id)

    menus = [m for m in all_db_menus if m.id in needed_ids]
    return _build_menu_tree(menus)


async def get_menu_by_id(db: AsyncSession, menu_id: int) -> MenuVO | None:
    """根据 ID 获取菜单。"""
    stmt = select(AdminMenu).where(
        AdminMenu.id == menu_id, AdminMenu.is_deleted == 0
    )
    result = await db.execute(stmt)
    menu = result.scalars().first()
    if menu is None:
        return None
    return _to_menu_vo(menu)


async def create_menu(db: AsyncSession, dto: CreateMenuDTO) -> None:
    """创建菜单。"""
    menu = AdminMenu(
        name=dto.name,
        path=dto.path,
        icon=dto.icon,
        component=dto.component,
        parent_id=dto.parent_id if dto.parent_id is not None else 0,
        type=dto.type,
        sort=dto.sort if dto.sort is not None else 0,
    )
    db.add(menu)
    await db.flush()


async def update_menu(
    db: AsyncSession, menu_id: int, dto: UpdateMenuDTO
) -> None:
    """更新菜单，仅更新�� None 字段。"""
    stmt = select(AdminMenu).where(
        AdminMenu.id == menu_id, AdminMenu.is_deleted == 0
    )
    result = await db.execute(stmt)
    menu = result.scalars().first()
    if menu is None:
        raise BusinessException(ResultCode.NOT_FOUND, "菜单不存在")

    if dto.name is not None:
        menu.name = dto.name
    if dto.path is not None:
        menu.path = dto.path
    if dto.icon is not None:
        menu.icon = dto.icon
    if dto.component is not None:
        menu.component = dto.component
    if dto.parent_id is not None:
        menu.parent_id = dto.parent_id
    if dto.type is not None:
        menu.type = dto.type
    if dto.sort is not None:
        menu.sort = dto.sort

    await db.flush()


async def delete_menu(db: AsyncSession, menu_id: int) -> None:
    """逻辑删除菜单及其所有子菜单（递归）。"""
    stmt = select(AdminMenu).where(
        AdminMenu.id == menu_id, AdminMenu.is_deleted == 0
    )
    result = await db.execute(stmt)
    menu = result.scalars().first()
    if menu is None:
        raise BusinessException(ResultCode.NOT_FOUND, "菜单不存在")

    await _delete_children(db, menu_id)

    upd = (
        update(AdminMenu)
        .where(AdminMenu.id == menu_id)
        .values(is_deleted=1)
    )
    await db.execute(upd)
    await db.flush()


async def _delete_children(db: AsyncSession, parent_id: int) -> None:
    """递归逻辑删除所有子菜单。"""
    child_stmt = select(AdminMenu).where(
        AdminMenu.parent_id == parent_id, AdminMenu.is_deleted == 0
    )
    child_result = await db.execute(child_stmt)
    children = list(child_result.scalars().all())

    for child in children:
        await _delete_children(db, child.id)
        upd = (
            update(AdminMenu)
            .where(AdminMenu.id == child.id)
            .values(is_deleted=1)
        )
        await db.execute(upd)


async def sort_menus(db: AsyncSession, items: list[SortMenuDTOItem]) -> None:
    """批量更新菜单排序值。"""
    for item in items:
        stmt = (
            update(AdminMenu)
            .where(AdminMenu.id == item.id)
            .values(sort=item.sort)
        )
        await db.execute(stmt)
    await db.flush()


async def get_role_menus(db: AsyncSession, role_id: int) -> RoleMenuVO:
    """获取角色的菜单分配情况（带 assigned 标记的树形结构）。"""
    # 验证角色存在
    role_stmt = select(AdminRole).where(
        AdminRole.id == role_id, AdminRole.is_deleted == 0
    )
    role_result = await db.execute(role_stmt)
    role = role_result.scalars().first()
    if role is None:
        raise BusinessException(ResultCode.NOT_FOUND, "角色不存在")

    # 查该角色已分配的菜单 IDs
    rm_stmt = select(AdminRoleMenu.menu_id).where(
        AdminRoleMenu.role_id == role_id, AdminRoleMenu.is_deleted == 0
    )
    rm_result = await db.execute(rm_stmt)
    assigned_ids: set[int] = set(rm_result.scalars().all())

    # 查全量菜单
    m_stmt = (
        select(AdminMenu)
        .where(AdminMenu.is_deleted == 0)
        .order_by(AdminMenu.sort.asc())
    )
    m_result = await db.execute(m_stmt)
    all_menus = list(m_result.scalars().all())

    # 按 parent_id 分组
    children_map: dict[int, list[AdminMenu]] = {}
    top_menus: list[AdminMenu] = []
    for m in all_menus:
        if m.parent_id is None or m.parent_id == 0:
            top_menus.append(m)
        else:
            children_map.setdefault(m.parent_id, []).append(m)

    # 构建分组
    groups: list[RoleMenuVOGroup] = []
    total_menus = 0
    assigned_count = 0

    for top in top_menus:
        top_assigned = top.id in assigned_ids
        total_menus += 1
        if top_assigned:
            assigned_count += 1

        children = children_map.get(top.id, [])
        dir_assigned = top.type == "directory" and top_assigned

        items: list[RoleMenuVOItem] = []
        child_assigned_count = 0
        for child in children:
            child_is_assigned = child.id in assigned_ids or dir_assigned
            items.append(
                RoleMenuVOItem(
                    id=child.id,
                    name=child.name,
                    path=child.path,
                    icon=child.icon,
                    type=child.type,
                    assigned=child_is_assigned,
                    covered_by_directory=dir_assigned,
                )
            )
            total_menus += 1
            if child_is_assigned:
                assigned_count += 1
                child_assigned_count += 1

        groups.append(
            RoleMenuVOGroup(
                id=top.id,
                name=top.name,
                path=top.path,
                icon=top.icon,
                type=top.type,
                assigned=top_assigned,
                children=items,
                assigned_count=child_assigned_count,
                total_count=len(children),
            )
        )

    summary = RoleMenuVOSummary(
        total_menus=total_menus,
        assigned_count=assigned_count,
    )

    return RoleMenuVO(
        role_id=role_id,
        role_name=role.name,
        groups=groups,
        summary=summary,
    )


async def sync_role_menus(
    db: AsyncSession, role_id: int, menu_ids: list[int]
) -> None:
    """原子同步角色菜单：目录覆盖展开、差量增删。"""
    expanded_ids: set[int] = set(menu_ids)

    # 目录覆盖：选中 directory 时自动加入其所有子菜单
    if menu_ids:
        dir_stmt = select(AdminMenu).where(
            AdminMenu.id.in_(menu_ids),
            AdminMenu.type == "directory",
            AdminMenu.is_deleted == 0,
        )
        dir_result = await db.execute(dir_stmt)
        directories = list(dir_result.scalars().all())

        for d in directories:
            child_stmt = select(AdminMenu.id).where(
                AdminMenu.parent_id == d.id, AdminMenu.is_deleted == 0
            )
            child_result = await db.execute(child_stmt)
            expanded_ids.update(child_result.scalars().all())

    # 查当前已分配
    cur_stmt = select(AdminRoleMenu.menu_id).where(
        AdminRoleMenu.role_id == role_id, AdminRoleMenu.is_deleted == 0
    )
    cur_result = await db.execute(cur_stmt)
    current_ids: set[int] = set(cur_result.scalars().all())

    # 需新增
    to_add = expanded_ids - current_ids
    for mid in to_add:
        db.add(AdminRoleMenu(role_id=role_id, menu_id=mid))

    # 需删除
    to_remove = current_ids - expanded_ids
    if to_remove:
        del_stmt = delete(AdminRoleMenu).where(
            AdminRoleMenu.role_id == role_id,
            AdminRoleMenu.menu_id.in_(to_remove),
        )
        await db.execute(del_stmt)

    await db.flush()


async def get_user_menu_overview(
    db: AsyncSession, user_id: int
) -> UserMenuOverviewVO:
    """获取用户菜单概览，包含来源追踪。"""
    # 验证用户
    user_stmt = select(AdminUser).where(
        AdminUser.id == user_id, AdminUser.is_deleted == 0
    )
    user_result = await db.execute(user_stmt)
    user = user_result.scalars().first()
    if user is None:
        raise BusinessException(ResultCode.NOT_FOUND, "用户不存在")

    is_superuser = user.is_superuser is not None and user.is_superuser == 1

    # 查用户角色
    ur_stmt = select(AdminUserRole.role_id).where(
        AdminUserRole.user_id == user_id, AdminUserRole.is_deleted == 0
    )
    ur_result = await db.execute(ur_stmt)
    role_ids = list(ur_result.scalars().all())

    roles: list[AdminRole] = []
    if role_ids:
        r_stmt = select(AdminRole).where(
            AdminRole.id.in_(role_ids), AdminRole.is_deleted == 0
        )
        r_result = await db.execute(r_stmt)
        roles = list(r_result.scalars().all())

    role_vos = [
        RoleBaseVO(
            id=r.id,
            name=r.name,
            code=r.code,
            description=r.description,
            status=r.status,
            sort=r.sort,
        )
        for r in roles
    ]

    # 查全量菜单
    m_stmt = (
        select(AdminMenu)
        .where(AdminMenu.is_deleted == 0)
        .order_by(AdminMenu.sort.asc())
    )
    m_result = await db.execute(m_stmt)
    all_menus = list(m_result.scalars().all())

    # 按 parent_id 分组
    children_map: dict[int, list[AdminMenu]] = {}
    top_menus: list[AdminMenu] = []
    for m in all_menus:
        if m.parent_id is None or m.parent_id == 0:
            top_menus.append(m)
        else:
            children_map.setdefault(m.parent_id, []).append(m)

    # 查角色→菜单关联：menuId → [角色名]
    menu_source_roles: dict[int, list[str]] = {}
    if role_ids:
        arm_stmt = select(AdminRoleMenu).where(
            AdminRoleMenu.role_id.in_(role_ids), AdminRoleMenu.is_deleted == 0
        )
        arm_result = await db.execute(arm_stmt)
        all_role_menus = list(arm_result.scalars().all())

        role_name_map = {r.id: r.name for r in roles}
        for rm in all_role_menus:
            menu_source_roles.setdefault(rm.menu_id, []).append(
                role_name_map.get(rm.role_id, "未知角色")
            )

    # 构建分组
    groups: list[UserMenuOverviewVOGroup] = []
    total_menus = 0
    granted_count = 0

    for top in top_menus:
        if is_superuser:
            top_granted = True
            top_source = "SUPER_USER"
            top_source_roles: list[str] = []
        else:
            top_source_roles = menu_source_roles.get(top.id, [])
            top_granted = len(top_source_roles) > 0
            top_source = "ROLE" if top_granted else "NONE"

        total_menus += 1
        if top_granted:
            granted_count += 1

        dir_granted = top.type == "directory" and top_granted
        children = children_map.get(top.id, [])
        items: list[UserMenuOverviewVOItem] = []
        child_granted = 0

        for child in children:
            if is_superuser:
                c_granted = True
                c_source = "SUPER_USER"
                c_source_roles: list[str] = []
                c_covered = False
            else:
                child_source_roles = menu_source_roles.get(child.id, [])
                directly_granted = len(child_source_roles) > 0

                if dir_granted and not directly_granted:
                    c_granted = True
                    c_source = "DIRECTORY"
                    c_source_roles = top_source_roles
                    c_covered = True
                else:
                    c_granted = directly_granted or dir_granted
                    c_source = (
                        "ROLE"
                        if directly_granted
                        else ("DIRECTORY" if dir_granted else "NONE")
                    )
                    c_source_roles = (
                        child_source_roles
                        if directly_granted
                        else (top_source_roles if dir_granted else [])
                    )
                    c_covered = dir_granted and not directly_granted

            items.append(
                UserMenuOverviewVOItem(
                    id=child.id,
                    name=child.name,
                    path=child.path,
                    icon=child.icon,
                    type=child.type,
                    granted=c_granted,
                    source=c_source,
                    source_roles=c_source_roles,
                    covered_by_directory=c_covered,
                )
            )
            total_menus += 1
            if c_granted:
                granted_count += 1
                child_granted += 1

        groups.append(
            UserMenuOverviewVOGroup(
                id=top.id,
                name=top.name,
                path=top.path,
                icon=top.icon,
                type=top.type,
                granted=top_granted,
                source=top_source,
                source_roles=top_source_roles,
                children=items,
                granted_count=child_granted,
                total_count=len(children),
            )
        )

    summary = UserMenuOverviewVOSummary(
        total_menus=total_menus,
        granted_count=granted_count,
    )

    return UserMenuOverviewVO(
        user_id=user_id,
        username=user.username,
        is_superuser=user.is_superuser,
        roles=role_vos,
        groups=groups,
        summary=summary,
    )
