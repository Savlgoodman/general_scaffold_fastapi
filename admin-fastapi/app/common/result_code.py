from enum import IntEnum


class ResultCode(IntEnum):
    """响应状态码枚举，对应 Java ResultCode"""

    SUCCESS = 200
    PARAM_ERROR = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    ACCOUNT_LOCKED = 423
    INTERNAL_SERVER_ERROR = 500

    @property
    def message(self) -> str:
        return _MESSAGES[self]


_MESSAGES = {
    ResultCode.SUCCESS: "OK",
    ResultCode.PARAM_ERROR: "参数错误",
    ResultCode.UNAUTHORIZED: "未认证",
    ResultCode.FORBIDDEN: "无权限",
    ResultCode.NOT_FOUND: "资源不存在",
    ResultCode.ACCOUNT_LOCKED: "账户已被锁定",
    ResultCode.INTERNAL_SERVER_ERROR: "服务器内部错误",
}
