"""RBAC 权限校验服务，对应 Java RBACServiceImpl.checkPermission()。

实现：超管放行 → 路径匹配 → 用户覆写优先 → 角色权限（priority+DENY优先）。
"""

import re
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.associations import (
    AdminRolePermission,
    AdminUserPermissionOverride,
    AdminUserRole,
)
from app.models.permission import AdminPermission
from app.models.user import AdminUser


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
