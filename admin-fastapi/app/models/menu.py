from sqlalchemy import BigInteger, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class AdminMenu(BaseEntity):
    """菜单，对应 admin_menu 表"""

    __tablename__ = "admin_menu"

    name: Mapped[str] = mapped_column(String(64), nullable=False)
    path: Mapped[str | None] = mapped_column(String(255))
    icon: Mapped[str | None] = mapped_column(String(64))
    component: Mapped[str | None] = mapped_column(String(255))
    parent_id: Mapped[int | None] = mapped_column(BigInteger)
    type: Mapped[str | None] = mapped_column(String(32))
    sort: Mapped[int | None] = mapped_column(Integer, default=0)
