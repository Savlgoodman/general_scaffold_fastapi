from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """SQLAlchemy 声明基类"""
    pass


class BaseEntity(Base):
    """实体基类，对应 Java BaseEntity。

    提供 id / create_time / update_time / is_deleted 四个公共字段。
    所有业务表模型继承此类。
    """

    __abstract__ = True

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    create_time: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    update_time: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    is_deleted: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
