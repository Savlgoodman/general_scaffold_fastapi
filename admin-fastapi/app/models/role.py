from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class AdminRole(BaseEntity):
    """角色，对应 admin_role 表"""

    __tablename__ = "admin_role"

    name: Mapped[str] = mapped_column(String(64), nullable=False)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    sort: Mapped[int | None] = mapped_column(Integer, default=0)
