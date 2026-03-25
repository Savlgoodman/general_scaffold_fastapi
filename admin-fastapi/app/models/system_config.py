from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseEntity


class SystemConfig(BaseEntity):
    """系统配置，对应 admin_system_config 表"""

    __tablename__ = "admin_system_config"

    config_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    config_value: Mapped[str | None] = mapped_column(String(2048))
    description: Mapped[str | None] = mapped_column(String(255))
    group_name: Mapped[str | None] = mapped_column(String(64))
    sort: Mapped[int | None] = mapped_column(Integer, default=0)
