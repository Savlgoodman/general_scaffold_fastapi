"""操作审计工具，对应 Java @OperationLog 注解 + OperationLogAspect。

提供两种用法：
1. 在 Router 中显式调用 log_operation()
2. 装饰器 @operation_log 用于 service 方法（需传 request 参数）
"""

import asyncio
import json
import logging
from functools import wraps

from fastapi import Request

from app.services.log_write_service import write_operation_log
from app.utils.ip_utils import get_client_ip

logger = logging.getLogger(__name__)


def log_operation(
    request: Request,
    module: str,
    op_type: str,
    description: str = "",
    params: object | None = None,
    result: object | None = None,
) -> None:
    """在 Router 中直接调用，异步写入操作日志。

    用法：
        log_operation(request, "用户管理", "CREATE", params=dto, result=user)
    """
    user_id = getattr(request.state, "user_id", None)
    username = getattr(request.state, "username", None)
    ip = get_client_ip(request)

    params_str = _serialize(params)
    result_str = _serialize(result)
    operation = f"{op_type}" + (f" ({description})" if description else "")

    asyncio.create_task(
        write_operation_log(
            user_id=user_id, username=username,
            module=module, operation=operation,
            method_name="", request_params=params_str,
            old_data=None, new_data=result_str, ip=ip,
        )
    )


def _serialize(obj: object | None) -> str | None:
    if obj is None:
        return None
    try:
        if hasattr(obj, "model_dump"):
            return json.dumps(obj.model_dump(by_alias=True), ensure_ascii=False, default=str)[:2000]
        if hasattr(obj, "__dict__"):
            d = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
            return json.dumps(d, ensure_ascii=False, default=str)[:2000]
    except Exception:
        pass
    return None
