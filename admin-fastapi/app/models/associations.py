from sqlalchemy import BigInteger, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class AdminUserRole(BaseEntity):
    """用户-角色关联，对应 admin_user_role 表"""

    __tablename__ = "admin_user_role"

    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False)


class AdminRolePermission(BaseEntity):
    """角色-权限关联，对应 admin_role_permission 表"""

    __tablename__ = "admin_role_permission"

    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    permission_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    effect: Mapped[str | None] = mapped_column(String(16), default="GRANT")
    priority: Mapped[int | None] = mapped_column(Integer, default=0)


class AdminRoleMenu(BaseEntity):
    """角色-菜单关联，对应 admin_role_menu 表"""

    __tablename__ = "admin_role_menu"

    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    menu_id: Mapped[int] = mapped_column(BigInteger, nullable=False)


class AdminUserPermissionOverride(BaseEntity):
    """用户权限覆盖，对应 admin_user_permission_override 表"""

    __tablename__ = "admin_user_permission_override"

    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    permission_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    effect: Mapped[str | None] = mapped_column(String(16), default="GRANT")
