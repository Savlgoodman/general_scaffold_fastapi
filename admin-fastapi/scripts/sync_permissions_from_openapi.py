#!/usr/bin/env python
"""
从 FastAPI OpenAPI 规范同步权限到 PostgreSQL 数据库

使用方法:
    cd admin-fastapi
    .venv/Scripts/python scripts/sync_permissions_from_openapi.py [选项]

选项:
    --openapi-url  OpenAPI JSON 的 URL (默认: http://localhost:8000/api-docs)
    --dry-run      预览模式，不实际修改数据库
    --verbose      详细输出

数据库配置自动从 admin-fastapi/.env 读取。也可通过命令行参数覆盖。

同步逻辑:
1. 从 FastAPI OpenAPI 提取所有 /api/admin/* 路径
2. 对比数据库 admin_permission 表:
   - 数据库中不存在的 -> 新增
   - 数据库中存在的 -> 更新 group_key/group_name（如有变化）
   - 数据库中存在但 OpenAPI 中没有的 -> 软删除
3. 组权限处理:
   - 取所有 API 路径的前三段（如 /api/admin/admin-users）
   - 去重后生成组权限（path=前缀/**, method=*）
"""
import sys
import os
import re
import argparse
import json
import urllib.request
from typing import List, Set, Dict, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone

try:
    import psycopg2
except ImportError:
    print("错误: 需要安装 psycopg2，请运行: pip install psycopg2-binary")
    sys.exit(1)

# 将项目根目录加入 path 以便读取 .env
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

# 不需要认证的路径前缀（排除，不生成权限记录）
SKIP_PREFIXES = (
    "/health",
    "/api/admin/auth/",
    "/api/admin/system-config/public",
)

# 需要认证但属于 auth 子路径的端点（保留生成权限）
AUTH_PROTECTED = (
    "/api/admin/auth/me",
    "/api/admin/auth/avatar",
)


@dataclass
class RouteInfo:
    path: str
    method: str
    tags: List[str]
    summary: str
    operation_id: str


@dataclass
class SyncResult:
    permissions_added: int = 0
    permissions_unchanged: int = 0
    permissions_updated: int = 0
    permissions_deleted: int = 0
    groups_added: int = 0
    groups_unchanged: int = 0
    groups_updated: int = 0
    groups_deleted: int = 0
    errors: List[str] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []


# ==================== 工具函数 ====================

def fetch_openapi_spec(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def should_skip_path(path: str) -> bool:
    """判断路径是否应跳过（公开路径不需要权限记录）"""
    # auth 下的受保护路径不跳过
    for protected in AUTH_PROTECTED:
        if path == protected or path.startswith(protected + "/"):
            return False
    for prefix in SKIP_PREFIXES:
        if path == prefix or path.startswith(prefix):
            return True
    # 非 /api/ 开头的也跳过（如 /docs, /redoc, /openapi.json）
    if not path.startswith("/api/"):
        return True
    return False


def extract_routes_from_openapi(spec: dict) -> List[RouteInfo]:
    routes = []
    paths = spec.get("paths", {})
    for path, path_item in paths.items():
        if should_skip_path(path):
            continue
        for method, operation in path_item.items():
            if method.upper() not in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                continue
            routes.append(RouteInfo(
                path=path,
                method=method.upper(),
                tags=operation.get("tags", []),
                summary=operation.get("summary", ""),
                operation_id=operation.get("operationId", ""),
            ))
    return routes


def convert_path_params_to_wildcard(path: str) -> str:
    """将路径参数转为通配符: /api/admin/roles/{id} -> /api/admin/roles/*"""
    path = re.sub(r"/\{[^}]+\}", "/*", path)
    return path


def extract_group_prefix(path: str) -> str:
    """提取前三段: /api/admin/admin-users/{id}/roles -> /api/admin/admin-users"""
    clean = re.sub(r"/\{[^}]+\}", "", path)
    parts = clean.strip("/").split("/")
    if len(parts) >= 3:
        return "/" + "/".join(parts[:3])
    return "/" + "/".join(parts) if parts else path


def generate_group_key(prefix: str) -> str:
    """/api/admin/admin-users -> admin_admin-users"""
    parts = prefix.strip("/").split("/")
    if parts and parts[0] == "api":
        parts = parts[1:]
    return "_".join(parts)


def generate_group_name(group_key: str) -> str:
    parts = group_key.replace("_", " ").replace("-", " ").split()
    return " ".join(part.capitalize() for part in parts)


def generate_code_from_path(path: str, method: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9]", "_", path.strip("/"))
    clean = re.sub(r"_+", "_", clean).strip("_")
    return f"{clean}_{method}".upper()


# ==================== 数据库操作 ====================

def get_db_connection(args):
    return psycopg2.connect(
        host=args.db_host,
        port=args.db_port,
        dbname=args.db_name,
        user=args.db_user,
        password=args.db_pass,
    )


def fetch_db_permissions(cursor, is_group: bool) -> Dict[Tuple[str, str], dict]:
    cursor.execute(
        "SELECT id, name, code, path, method, group_key, group_name, is_group, status "
        "FROM admin_permission WHERE is_group = %s AND is_deleted = 0",
        (1 if is_group else 0,),
    )
    columns = [desc[0] for desc in cursor.description]
    return {
        (row_dict["path"], row_dict["method"]): row_dict
        for row in cursor.fetchall()
        for row_dict in [dict(zip(columns, row))]
    }


def insert_permission(cursor, *, name, code, path, method, group_key, group_name, is_group, description, status=1):
    now = datetime.now(timezone.utc)
    cursor.execute(
        "INSERT INTO admin_permission "
        "(name, code, path, method, group_key, group_name, is_group, description, status, is_deleted, create_time, update_time) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0, %s, %s)",
        (name, code, path, method, group_key, group_name, 1 if is_group else 0, description, status, now, now),
    )


def update_permission_group(cursor, perm_id: int, group_key: str, group_name: str):
    now = datetime.now(timezone.utc)
    cursor.execute(
        "UPDATE admin_permission SET group_key = %s, group_name = %s, update_time = %s WHERE id = %s",
        (group_key, group_name, now, perm_id),
    )


def soft_delete_permission(cursor, perm_id: int):
    now = datetime.now(timezone.utc)
    cursor.execute(
        "UPDATE admin_permission SET is_deleted = 1, update_time = %s WHERE id = %s",
        (now, perm_id),
    )


# ==================== 同步逻辑 ====================

def sync_permissions(cursor, routes: List[RouteInfo], dry_run: bool, verbose: bool) -> SyncResult:
    result = SyncResult()

    # 1. 子权限
    openapi_permissions: Dict[Tuple[str, str], RouteInfo] = {}
    group_prefixes: Set[str] = set()

    for route in routes:
        resource_pattern = convert_path_params_to_wildcard(route.path)
        key = (resource_pattern, route.method)
        openapi_permissions[key] = route
        group_prefixes.add(extract_group_prefix(route.path))

    if verbose:
        print(f"\n从 OpenAPI 提取到 {len(openapi_permissions)} 个权限")
        print(f"提取到 {len(group_prefixes)} 个组前缀:")
        for prefix in sorted(group_prefixes):
            print(f"  - {prefix} -> {generate_group_key(prefix)}")

    db_permission_map = fetch_db_permissions(cursor, is_group=False)
    if verbose:
        print(f"\n数据库中有 {len(db_permission_map)} 个非组权限")

    for key, route in openapi_permissions.items():
        resource_pattern, method = key
        prefix = extract_group_prefix(route.path)
        group_key = generate_group_key(prefix)
        group_name = generate_group_name(group_key)

        if key not in db_permission_map:
            code = generate_code_from_path(route.path, route.method)
            if not dry_run:
                insert_permission(
                    cursor, name=route.summary or route.operation_id or route.path,
                    code=code, path=resource_pattern, method=method,
                    group_key=group_key, group_name=group_name, is_group=False,
                    description=f"从 OpenAPI 同步: {route.operation_id or route.summary}",
                )
            result.permissions_added += 1
            if verbose:
                print(f"  [新增] {method} {resource_pattern}")
        else:
            existing = db_permission_map[key]
            if existing["group_key"] != group_key or existing["group_name"] != group_name:
                if not dry_run:
                    update_permission_group(cursor, existing["id"], group_key, group_name)
                result.permissions_updated += 1
                if verbose:
                    print(f"  [更新] {method} {resource_pattern} -> group: {group_key}")
            else:
                result.permissions_unchanged += 1

    for key, perm in db_permission_map.items():
        if key not in openapi_permissions:
            if not dry_run:
                soft_delete_permission(cursor, perm["id"])
            result.permissions_deleted += 1
            if verbose:
                print(f"  [删除] {perm['method']} {perm['path']}")

    # 2. 组权限
    openapi_groups: Dict[Tuple[str, str], str] = {}
    for prefix in group_prefixes:
        group_path = prefix + "/**"
        openapi_groups[(group_path, "*")] = generate_group_key(prefix)

    if verbose:
        print(f"\n需要的组权限 ({len(openapi_groups)} 个):")
        for (gp, _), gk in sorted(openapi_groups.items()):
            print(f"  - {gp} (group_key: {gk})")

    db_group_map = fetch_db_permissions(cursor, is_group=True)
    if verbose:
        print(f"\n数据库中有 {len(db_group_map)} 个组权限")

    for (group_path, group_method), group_key in openapi_groups.items():
        key = (group_path, group_method)
        group_name = generate_group_name(group_key)

        if key not in db_group_map:
            if not dry_run:
                insert_permission(
                    cursor, name=f"{group_name} 全部权限",
                    code=generate_code_from_path(group_path, "STAR"),
                    path=group_path, method="*",
                    group_key=group_key, group_name=group_name, is_group=True,
                    description=f"自动生成的组权限，匹配 {group_path}",
                )
            result.groups_added += 1
            if verbose:
                print(f"  [新增组] {group_path} (group_key: {group_key})")
        else:
            existing = db_group_map[key]
            if existing["group_key"] != group_key or existing["group_name"] != group_name:
                if not dry_run:
                    update_permission_group(cursor, existing["id"], group_key, group_name)
                result.groups_updated += 1
                if verbose:
                    print(f"  [更新组] {group_path} -> group_key: {group_key}")
            else:
                result.groups_unchanged += 1

    for key, perm in db_group_map.items():
        if key not in openapi_groups:
            if not dry_run:
                soft_delete_permission(cursor, perm["id"])
            result.groups_deleted += 1
            if verbose:
                print(f"  [删除组] {perm['path']}")

    return result


# ==================== .env 配置��取 ====================

def load_dotenv_config() -> dict:
    """从 admin-fastapi/.env 读取数据库配置"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_file = os.path.join(script_dir, "..", ".env")
    if not os.path.exists(env_file):
        return {}

    config = {}
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                config[k.strip()] = v.strip()

    result = {}
    if config.get("DB_HOST"):
        result["host"] = config["DB_HOST"]
    if config.get("DB_PORT"):
        result["port"] = config["DB_PORT"]
    if config.get("DB_NAME"):
        result["name"] = config["DB_NAME"]
    if config.get("DB_USERNAME"):
        result["username"] = config["DB_USERNAME"]
    if config.get("DB_PASSWORD"):
        result["password"] = config["DB_PASSWORD"]

    if result:
        print(f"  从 .env 读取配置: {result.get('host', '?')}:{result.get('port', '5432')}/{result.get('name', '?')}")

    return result


# ==================== 主函数 ====================

def main():
    parser = argparse.ArgumentParser(description="从 FastAPI OpenAPI 同步权限到数据库")
    parser.add_argument("--openapi-url", default="http://localhost:8000/api-docs",
                        help="OpenAPI JSON URL (默认: http://localhost:8000/api-docs)")
    parser.add_argument("--db-host", default=None, help="数据库主机")
    parser.add_argument("--db-port", default=None, help="数据库端口")
    parser.add_argument("--db-name", default=None, help="数据库名称")
    parser.add_argument("--db-user", default=None, help="数据库用户")
    parser.add_argument("--db-pass", default=None, help="数据库密码")
    parser.add_argument("--dry-run", action="store_true", help="预览模式，不实际修改数据库")
    parser.add_argument("--verbose", "-v", action="store_true", help="详细输出")
    args = parser.parse_args()

    print("=" * 60)
    print("  权限同步��本 (FastAPI → PostgreSQL)")
    print("=" * 60)

    if args.dry_run:
        print("[预览模式] 不会实际修改数据库\n")

    # 读取 .env 配置（优先级: 命令行 > 环境变量 > .env > 默认值）
    env_config = load_dotenv_config()

    args.db_host = args.db_host or os.environ.get("DB_HOST") or env_config.get("host", "localhost")
    args.db_port = args.db_port or os.environ.get("DB_PORT") or env_config.get("port", "5432")
    args.db_name = args.db_name or os.environ.get("DB_NAME") or env_config.get("name", "scaffold_fastapi_dev")
    args.db_user = args.db_user or os.environ.get("DB_USERNAME") or env_config.get("username", "postgres")
    args.db_pass = args.db_pass or os.environ.get("DB_PASSWORD") or env_config.get("password", "postgres")

    # 1. 获取 OpenAPI
    print(f"\n正在从 {args.openapi_url} 获取 OpenAPI 规范...")
    try:
        spec = fetch_openapi_spec(args.openapi_url)
        print(f"  OpenAPI: {spec.get('info', {}).get('title', 'Unknown')} v{spec.get('info', {}).get('version', '?')}")
    except Exception as e:
        print(f"  获取失败: {e}")
        sys.exit(1)

    # 2. 提取路由
    print("\n正在解析路由...")
    routes = extract_routes_from_openapi(spec)
    print(f"  提取到 {len(routes)} 个需要权限的路由")

    if args.verbose:
        print("\n路由列表:")
        for route in routes:
            rp = convert_path_params_to_wildcard(route.path)
            gk = generate_group_key(extract_group_prefix(route.path))
            print(f"  [{route.method:6s}] {rp:50s} -> {gk}")

    # 3. 连接数据库
    print(f"\n正在连接数据库 {args.db_host}:{args.db_port}/{args.db_name}...")
    try:
        conn = get_db_connection(args)
        cursor = conn.cursor()
        print("  连接成功")
    except Exception as e:
        print(f"  连接失败: {e}")
        sys.exit(1)

    # 4. 同步
    print("\n正在同步权限...")
    try:
        result = sync_permissions(cursor, routes, dry_run=args.dry_run, verbose=args.verbose)
        if not args.dry_run:
            conn.commit()

        print("\n" + "=" * 60)
        print("  同步结果")
        print("=" * 60)
        print(f"  子权限: 新增 {result.permissions_added} | 更新 {result.permissions_updated} | "
              f"不变 {result.permissions_unchanged} | 删除 {result.permissions_deleted}")
        print(f"  组权限: 新增 {result.groups_added} | 更新 {result.groups_updated} | "
              f"不变 {result.groups_unchanged} | 删除 {result.groups_deleted}")

        if result.errors:
            print(f"\n  错误 ({len(result.errors)}):")
            for err in result.errors:
                print(f"    - {err}")

        if args.dry_run:
            print("\n  [预览模式] 去掉 --dry-run 以实际同步")
        else:
            print("\n  同步完成!")

    except Exception as e:
        print(f"  同步失败: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
