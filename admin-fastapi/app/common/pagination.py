from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PageResult(BaseModel, Generic[T]):
    """分页响应封装，字段名与 MyBatis-Plus Page<T> 一致"""

    total: int = 0
    records: list[T] = []
    current: int = 1
    size: int = 10
