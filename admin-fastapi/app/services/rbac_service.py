"""RBAC 权限校验与管理服务，对应 Java RBACServiceImpl。

包含：权限检查、用户角色管理、角色权限同步、用户权限覆写、权限/菜单总览。
"""

import re
from collections.abc import Sequence

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.associations import (
    AdminRolePermission,
    AdminUserPermissionOverride,
    AdminUserRole,
)
from app.models.permission import AdminPermission
from app.models.role import AdminRole
from app.models.user import AdminUser
from app.schemas.permission import (
    PermissionBaseVO,
    PermissionGroupVO,
    UserPermGroupSection,
    UserPermOverrideItem,
    UserPermPermissionRow,
    UserPermSummary,
    UserPermissionOverviewVO,
)
from app.schemas.role import (
    RoleBaseVO,
    RolePermFullGroupSection,
    RolePermFullPermissionItem,
    RolePermFullSummary,
    RolePermissionFullVO,
)
from app.schemas.rbac import SyncUserOverridesDTO


async def check_permission(db: AsyncSession, user_id: int, path: str, method: str) -> bool:
    """检查用户是否有访问指定接口的权限。"""

    # 1. 查用户，超管直接放行
    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id, AdminUser.is_deleted == 0))
    user = result.scalar_one_or_none()
    if user is None:
        return False
    if user.is_superuser == 1:
        return True

    # 2. 查找匹配的权限记录
    matched_perms = await _find_matching_permissions(db, path, method)
    if not matched_perms:
        return False

    matched_perm_ids = [p.id for p in matched_perms]

    # 3. 查用户覆写（优先级最高）
    result = await db.execute(
        select(AdminUserPermissionOverride).where(
            AdminUserPermissionOverride.user_id == user_id,
            AdminUserPermissionOverride.permission_id.in_(matched_perm_ids),
            AdminUserPermissionOverride.is_deleted == 0,
        )
    )
    overrides = {o.permission_id: o for o in result.scalars().all()}

    # 4. 获取用户角色 ID
    result = await db.execute(
        select(AdminUserRole.role_id).where(
            AdminUserRole.user_id == user_id,
            AdminUserRole.is_deleted == 0,
        )
    )
    role_ids = [r for r in result.scalars().all()]

    # 5. 批量获取角色权限
    role_perm_map: dict[int, AdminRolePermission] = {}
    if role_ids:
        result = await db.execute(
            select(AdminRolePermission).where(
                AdminRolePermission.role_id.in_(role_ids),
                AdminRolePermission.is_deleted == 0,
            )
        )
        for rp in result.scalars().all():
            if rp.permission_id not in role_perm_map:
                role_perm_map[rp.permission_id] = rp

    # 6. 逐个匹��权限，覆写优先
    matched_role_perms: list[AdminRolePermission] = []
    for perm in matched_perms:
        override = overrides.get(perm.id)
        if override is not None:
            return override.effect == "GRANT"

        rp = role_perm_map.get(perm.id)
        if rp is not None:
            matched_role_perms.append(rp)

    if not matched_role_perms:
        return False

    # 7. 按 priority 降序，同优先级 DENY 优先
    matched_role_perms.sort(key=lambda rp: (-(rp.priority or 0), 0 if rp.effect == "DENY" else 1))
    return matched_role_perms[0].effect == "GRANT"


async def _find_matching_permissions(
    db: AsyncSession, path: str, method: str
) -> Sequence[AdminPermission]:
    """查找���请求路径+方法匹配的所有权限记录。"""
    result = await db.execute(
        select(AdminPermission).where(
            AdminPermission.status == 1,
            AdminPermission.is_deleted == 0,
        )
    )
    all_perms = result.scalars().all()

    matched = []
    for perm in all_perms:
        # 方法匹配
        if perm.method and perm.method != "*" and perm.method.upper() != method.upper():
            continue
        # 路径匹配
        if match_pattern(perm.path, path):
            matched.append(perm)
    return matched


def match_pattern(pattern: str | None, path: str | None) -> bool:
    """路径匹配，对应 Java PermissionServiceImpl.matchPattern()。

    支持：
    - /** 双通配符：匹配前缀路径本身及所有子路径
    - * 单通配符：匹配单层路径段
    - 精确匹配
    """
    if not pattern or not path:
        return False

    if "**" in pattern:
        ds_index = pattern.index("**")
        prefix = pattern[:ds_index]
        prefix_no_slash = prefix.rstrip("/")
        if path == prefix_no_slash:
            return True
        if path.startswith(prefix):
            return True
        return False

    if "*" in pattern or "?" in pattern:
        regex = pattern.replace("*", "[^/]*").replace("?", "[^/]")
        return bool(re.match(f"^{regex}$", path))

    return pattern == path


# ══════════════════════════════════════════════════════════
#  用户-角色关联
# ══════════════════════════════════════════════════════════


async def get_user_roles(db: AsyncSession, user_id: int) -> list[AdminRole]:
    result = await db.execute(
        select(AdminUserRole.role_id).where(AdminUserRole.user_id == user_id, AdminUserRole.is_deleted == 0)
    )
    role_ids = result.scalars().all()
    if not role_ids:
        return []
    result = await db.execute(
        select(AdminRole).where(AdminRole.id.in_(role_ids), AdminRole.is_deleted == 0)
    )
    return list(result.scalars().all())


async def sync_user_roles(db: AsyncSession, user_id: int, role_ids: list[int]) -> None:
    """全量替换用户角色（逻辑删除旧的 + 插入新的）。"""
    # 软删除现有关联
    await db.execute(
        update(AdminUserRole).where(AdminUserRole.user_id == user_id, AdminUserRole.is_deleted == 0)
        .values(is_deleted=1)
    )
    # 插入新关联
    for rid in (role_ids or []):
        db.add(AdminUserRole(user_id=user_id, role_id=rid))
    await db.commit()


# ══════════════════════════════════════════════════════════
#  角色权限完整视图 + 同步
# ══════════════════════════════════════════════════════════


async def get_role_permissions_full(db: AsyncSession, role_id: int) -> RolePermissionFullVO | None:
    """获取角色权限完整视图（含组覆盖标记），对应 Java getRolePermissionsFull。"""
    result = await db.execute(select(AdminRole).where(AdminRole.id == role_id, AdminRole.is_deleted == 0))
    role = result.scalar_one_or_none()
    if role is None:
        return None

    # 角色已分配的权限
    result = await db.execute(
        select(AdminRolePermission).where(AdminRolePermission.role_id == role_id, AdminRolePermission.is_deleted == 0)
    )
    assigned_map = {rp.permission_id: rp for rp in result.scalars().all()}

    # 所有分组权限
    from app.services.permission_service import get_all_grouped_permissions
    all_groups = await get_all_grouped_permissions(db)

    groups = []
    total_perms = assigned_count = grant_count = deny_count = 0

    for group in all_groups:
        gp = group.group_permission
        group_is_granted = False
        group_item = None

        if gp:
            rp = assigned_map.get(gp.id)
            group_item = RolePermFullPermissionItem(
                id=gp.id, name=gp.name, code=gp.code, path=gp.path, method=gp.method,
                assigned=rp is not None, effect=rp.effect if rp else None,
            )
            group_is_granted = rp is not None and rp.effect == "GRANT"
            if rp:
                assigned_count += 1
                if rp.effect == "GRANT": grant_count += 1
                else: deny_count += 1
            total_perms += 1

        children = []
        child_assigned = 0
        for child in group.children:
            rp = assigned_map.get(child.id)
            item = RolePermFullPermissionItem(
                id=child.id, name=child.name, code=child.code, path=child.path, method=child.method,
                assigned=rp is not None, effect=rp.effect if rp else None,
                covered_by_group=group_is_granted,
            )
            if rp:
                child_assigned += 1
                assigned_count += 1
                if rp.effect == "GRANT": grant_count += 1
                else: deny_count += 1
            total_perms += 1
            children.append(item)

        section = RolePermFullGroupSection(
            group_key=group.group_key, group_name=group.group_name,
            group_permission=group_item.model_dump(by_alias=True) if group_item else None,
            children=children,
            total_count=len(group.children) + (1 if gp else 0),
            assigned_count=child_assigned + (1 if group_item and group_item.assigned else 0),
        )
        groups.append(section)

    return RolePermissionFullVO(
        role_id=role.id, role_name=role.name, role_code=role.code,
        groups=groups,
        summary=RolePermFullSummary(
            total_permissions=total_perms, assigned_count=assigned_count,
            grant_count=grant_count, deny_count=deny_count,
        ),
    )


async def sync_role_permissions(db: AsyncSession, role_id: int, permissions: list[dict]) -> None:
    """原子同步角色权限（对比差异，批量增删改）。"""
    result = await db.execute(
        select(AdminRolePermission).where(AdminRolePermission.role_id == role_id, AdminRolePermission.is_deleted == 0)
    )
    current_map = {rp.permission_id: rp for rp in result.scalars().all()}

    desired_ids = set()
    for item in permissions:
        pid = item["permission_id"]
        effect = item["effect"]
        desired_ids.add(pid)

        existing = current_map.get(pid)
        if existing:
            if existing.effect != effect:
                existing.effect = effect
                await db.flush()
        else:
            db.add(AdminRolePermission(role_id=role_id, permission_id=pid, effect=effect, priority=0))

    # 软删除不在期望集合中的
    to_remove = [pid for pid in current_map if pid not in desired_ids]
    if to_remove:
        await db.execute(
            update(AdminRolePermission)
            .where(AdminRolePermission.role_id == role_id, AdminRolePermission.permission_id.in_(to_remove))
            .values(is_deleted=1)
        )
    await db.commit()


# ══════════════════════════════════════════════════════════
#  用户权限总览
# ══════════════════════════════════════════════════════════


async def get_user_permission_overview(db: AsyncSession, user_id: int) -> UserPermissionOverviewVO | None:
    """获取用户权限完整视图，对应 Java getUserPermissionOverview。"""
    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id, AdminUser.is_deleted == 0))
    user = result.scalar_one_or_none()
    if user is None:
        return None

    is_su = user.is_superuser == 1
    roles = await get_user_roles(db, user_id)
    role_vos = [RoleBaseVO(id=r.id, name=r.name, code=r.code, description=r.description, status=r.status, sort=r.sort) for r in roles]

    from app.services.permission_service import get_all_grouped_permissions
    all_groups = await get_all_grouped_permissions(db)

    # 超管：所有权限 GRANT
    if is_su:
        groups = []
        total = 0
        for group in all_groups:
            children = []
            if group.group_permission:
                children.append(_su_row(group.group_permission, True))
                total += 1
            for c in group.children:
                children.append(_su_row(c, False))
                total += 1
            groups.append(UserPermGroupSection(group_key=group.group_key, group_name=group.group_name, children=children))
        return UserPermissionOverviewVO(
            user_id=user_id, username=user.username, is_superuser=1, roles=role_vos,
            groups=groups, overrides=[],
            summary=UserPermSummary(total_permissions=total, granted_count=total),
        )

    # 普通用户
    role_ids = [r.id for r in roles]
    perm_to_roles: dict[int, list[dict]] = {}
    if role_ids:
        result = await db.execute(
            select(AdminRolePermission).where(AdminRolePermission.role_id.in_(role_ids), AdminRolePermission.is_deleted == 0)
        )
        role_name_map = {r.id: r.name for r in roles}
        for rp in result.scalars().all():
            perm_to_roles.setdefault(rp.permission_id, []).append({
                "role_name": role_name_map.get(rp.role_id, ""), "effect": rp.effect, "priority": rp.priority or 0,
            })

    # 用户覆盖
    result = await db.execute(
        select(AdminUserPermissionOverride).where(AdminUserPermissionOverride.user_id == user_id, AdminUserPermissionOverride.is_deleted == 0)
    )
    override_map = {o.permission_id: o for o in result.scalars().all()}

    groups = []
    override_items = []
    granted = denied = unassigned = 0

    for group in all_groups:
        children = []
        group_is_granted = False
        group_source_roles: list[str] = []

        if group.group_permission:
            gp = group.group_permission
            row = _build_perm_row(gp.id, gp.name, gp.path, gp.method, True, perm_to_roles, override_map)
            children.append(row)
            group_is_granted = row.final_effect == "GRANT"
            group_source_roles = row.source_roles
            if row.final_effect == "GRANT": granted += 1
            elif row.final_effect == "DENY": denied += 1
            else: unassigned += 1
            if row.has_override and gp.id in override_map:
                override_items.append(_build_override_item(override_map[gp.id], gp))

        for child in group.children:
            row = _build_perm_row(child.id, child.name, child.path, child.method, False, perm_to_roles, override_map)
            if group_is_granted and row.source == "NONE":
                row.final_effect = "GRANT"
                row.source = "ROLE"
                row.source_roles = group_source_roles
                row.covered_by_group = True
            children.append(row)
            if row.final_effect == "GRANT": granted += 1
            elif row.final_effect == "DENY": denied += 1
            else: unassigned += 1
            if row.has_override and child.id in override_map:
                override_items.append(_build_override_item(override_map[child.id], child))

        groups.append(UserPermGroupSection(group_key=group.group_key, group_name=group.group_name, children=children))

    return UserPermissionOverviewVO(
        user_id=user_id, username=user.username, is_superuser=user.is_superuser, roles=role_vos,
        groups=groups, overrides=override_items,
        summary=UserPermSummary(
            total_permissions=granted + denied + unassigned,
            granted_count=granted, denied_count=denied, unassigned_count=unassigned,
            override_count=len(override_items),
        ),
    )


def _su_row(perm: PermissionBaseVO, is_group: bool) -> UserPermPermissionRow:
    return UserPermPermissionRow(
        permission_id=perm.id, name=perm.name, path=perm.path, method=perm.method,
        is_group=1 if is_group else 0, final_effect="GRANT", source="SUPER_USER",
    )


def _build_perm_row(
    perm_id, name, path, method, is_group,
    perm_to_roles: dict, override_map: dict,
) -> UserPermPermissionRow:
    row = UserPermPermissionRow(
        permission_id=perm_id, name=name, path=path, method=method,
        is_group=1 if is_group else 0,
    )
    role_infos = perm_to_roles.get(perm_id, [])
    source_roles = list({r["role_name"] for r in role_infos})

    role_effect = None
    if role_infos:
        sorted_infos = sorted(role_infos, key=lambda r: (-r["priority"], 0 if r["effect"] == "DENY" else 1))
        role_effect = sorted_infos[0]["effect"]

    row.source_roles = source_roles
    override = override_map.get(perm_id)
    if override:
        row.has_override = True
        row.override_id = override.id
        row.override_effect = override.effect
        row.final_effect = override.effect
        row.source = "OVERRIDE"
    elif role_effect:
        row.final_effect = role_effect
        row.source = "ROLE"
    else:
        row.source = "NONE"
    return row


def _build_override_item(override, perm: PermissionBaseVO) -> UserPermOverrideItem:
    return UserPermOverrideItem(
        override_id=override.id, permission_id=override.permission_id,
        permission_name=perm.name, path=perm.path, method=perm.method,
        effect=override.effect, create_time=override.create_time,
    )


# ══════════════════════════════════════════════════════════
#  用户权限覆盖管理
# ══════════════════════════════════════════════════════════


async def sync_user_overrides(db: AsyncSession, user_id: int, dto: SyncUserOverridesDTO) -> None:
    result = await db.execute(
        select(AdminUserPermissionOverride).where(AdminUserPermissionOverride.user_id == user_id, AdminUserPermissionOverride.is_deleted == 0)
    )
    current_map = {o.permission_id: o for o in result.scalars().all()}

    desired_ids = set()
    for item in dto.overrides:
        desired_ids.add(item.permission_id)
        existing = current_map.get(item.permission_id)
        if existing:
            if existing.effect != item.effect:
                existing.effect = item.effect
                await db.flush()
        else:
            db.add(AdminUserPermissionOverride(user_id=user_id, permission_id=item.permission_id, effect=item.effect))

    to_remove = [pid for pid in current_map if pid not in desired_ids]
    if to_remove:
        await db.execute(
            update(AdminUserPermissionOverride)
            .where(AdminUserPermissionOverride.user_id == user_id, AdminUserPermissionOverride.permission_id.in_(to_remove))
            .values(is_deleted=1)
        )
    await db.commit()


async def remove_user_permission_override(db: AsyncSession, user_id: int, override_id: int) -> None:
    await db.execute(
        update(AdminUserPermissionOverride)
        .where(AdminUserPermissionOverride.id == override_id, AdminUserPermissionOverride.user_id == user_id)
        .values(is_deleted=1)
    )
    await db.commit()


async def clear_user_permission_overrides(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        update(AdminUserPermissionOverride)
        .where(AdminUserPermissionOverride.user_id == user_id, AdminUserPermissionOverride.is_deleted == 0)
        .values(is_deleted=1)
    )
    await db.commit()
