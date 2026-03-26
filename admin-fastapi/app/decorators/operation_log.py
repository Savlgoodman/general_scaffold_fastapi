"""操作审计装饰器，对应 Java @OperationLog 注解 + OperationLogAspect。

用法：
    @operation_log(module="用户管理", op_type="CREATE")
    async def create_user(db, dto, request): ...
"""

import asyncio
import json
import logging
from functools import wraps

from app.services.log_write_service import write_operation_log

logger = logging.getLogger(__name__)


def operation_log(module: str, op_type: str, description: str = ""):
    """操作审计装饰器。

    Args:
        module: 业务模块名，如 "用户管理"、"角色管理"
        op_type: 操作类型，如 "CREATE"、"UPDATE"、"DELETE"
        description: 可选补充说明
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)

            # 尝试提取 request 对象获取用户信息和 IP
            request = kwargs.get("request")
            if request is None:
                for arg in args:
                    if hasattr(arg, "state") and hasattr(arg, "url"):
                        request = arg
                        break

            user_id = None
            username = None
            ip = "unknown"
            if request:
                user_id = getattr(request.state, "user_id", None)
                username = getattr(request.state, "username", None)
                from app.utils.ip_utils import get_client_ip
                ip = get_client_ip(request)

            # 序列化参数
            params_str = None
            try:
                # 尝试提取 dto 参数
                dto = kwargs.get("dto")
                if dto and hasattr(dto, "model_dump"):
                    params_str = json.dumps(dto.model_dump(by_alias=True), ensure_ascii=False, default=str)
            except Exception:
                pass

            # 序列化结果
            new_data = None
            try:
                if result and hasattr(result, "model_dump"):
                    new_data = json.dumps(result.model_dump(by_alias=True), ensure_ascii=False, default=str)
                elif result and hasattr(result, "__dict__"):
                    new_data = json.dumps(
                        {k: v for k, v in result.__dict__.items() if not k.startswith("_")},
                        ensure_ascii=False, default=str,
                    )
            except Exception:
                pass

            operation = f"{op_type}" + (f" ({description})" if description else "")

            asyncio.create_task(
                write_operation_log(
                    user_id=user_id,
                    username=username,
                    module=module,
                    operation=operation,
                    method_name=func.__qualname__,
                    request_params=params_str,
                    old_data=None,
                    new_data=new_data,
                    ip=ip,
                )
            )

            return result

        return wrapper

    return decorator
