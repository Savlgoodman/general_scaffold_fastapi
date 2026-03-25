"""安全相关常量，对应 Java SecurityConstants。

PUBLIC_PATH_PREFIXES 中的路径不需要认证。
"""

# 需要认证的 auth 子路径（从公开路径中排除）
_AUTH_PROTECTED_PATHS: list[str] = [
    "/api/admin/auth/me",
    "/api/admin/auth/avatar",
]

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
    # 先检查是否是需要认证的 auth 子路径
    for protected in _AUTH_PROTECTED_PATHS:
        if path == protected or path.startswith(protected + "/"):
            return False

    for prefix in PUBLIC_PATH_PREFIXES:
        if path == prefix or path.startswith(prefix):
            return True
    return False
