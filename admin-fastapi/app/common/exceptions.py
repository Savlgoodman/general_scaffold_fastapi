from __future__ import annotations

from app.common.result_code import ResultCode


class BusinessException(Exception):
    """业务异常，对应 Java BusinessException"""

    def __init__(
        self,
        code: int | ResultCode = ResultCode.PARAM_ERROR,
        message: str | None = None,
    ):
        if isinstance(code, ResultCode):
            self.code = code.value
            self.message = message or code.message
        else:
            self.code = code
            self.message = message or "请求错误"
        super().__init__(self.message)
