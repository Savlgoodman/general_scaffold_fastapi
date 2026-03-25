"""客户端 IP 提取工具，对应 Java IpUtils。"""

from fastapi import Request


def get_client_ip(request: Request) -> str:
    """从请求中提取客户端真实 IP。

    优先级：X-Forwarded-For → X-Real-IP → client.host
    """
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    return request.client.host if request.client else "unknown"
