from sqlalchemy import BigInteger, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class AdminPermission(BaseEntity):
    """权限，对应 admin_permission 表"""

    __tablename__ = "admin_permission"

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[str | None] = mapped_column(String(128))
    type: Mapped[str | None] = mapped_column(String(32))
    method: Mapped[str | None] = mapped_column(String(16))
    path: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(255))
    parent_id: Mapped[int | None] = mapped_column(BigInteger)
    sort: Mapped[int | None] = mapped_column(Integer, default=0)
    group_key: Mapped[str | None] = mapped_column(String(64))
    group_name: Mapped[str | None] = mapped_column(String(64))
    is_group: Mapped[int | None] = mapped_column(Integer, default=0)
    status: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
