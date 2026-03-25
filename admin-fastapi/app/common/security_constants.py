"""安全相关常量，对应 Java SecurityConstants。

PUBLIC_PATH_PREFIXES 中的路径不需要认证。
"""

PUBLIC_PATH_PREFIXES: list[str] = [
    "/health",
    "/api/admin/auth/",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api-docs",
    "/api/admin/system-config/public",
]


def is_public_path(path: str) -> bool:
    """判断请求路径是否为公开路径（无需认证）"""
    for prefix in PUBLIC_PATH_PREFIXES:
        if path == prefix or path.startswith(prefix):
            return True
    return False
