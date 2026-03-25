from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel

from app.common.result_code import ResultCode

T = TypeVar("T")


class R(BaseModel, Generic[T]):
    """统一响应封装，对应 Java R<T>"""

    code: int = 200
    message: str = "success"
    data: T | None = None

    @classmethod
    def ok(cls, data: Any = None, message: str = "success") -> R:
        return cls(code=ResultCode.SUCCESS, message=message, data=data)

    @classmethod
    def error(cls, code: int | ResultCode = ResultCode.INTERNAL_SERVER_ERROR, message: str | None = None) -> R:
        if isinstance(code, ResultCode):
            return cls(code=code.value, message=message or code.message, data=None)
        return cls(code=code, message=message or "未知错误", data=None)
