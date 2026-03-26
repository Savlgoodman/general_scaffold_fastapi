"""对比权限校验：当前多次查询 vs 单 SQL 方案。

需要 .env 配置正确。直接连数据库测试，不需要启动服务。
"""
import asyncio
import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncpg
from app.config import get_settings

settings = get_settings()

# 测试参数：admin 用户访问用户列表
TEST_USER_ID = 9   # 非超管用户，走完整权限逻辑
TEST_PATH = "/api/admin/admin-users"
TEST_METHOD = "GET"
ROUNDS = 20


async def get_conn():
    return await asyncpg.connect(
        host=settings.db_host, port=settings.db_port,
        user=settings.db_username, password=settings.db_password,
        database=settings.db_name,
    )


# ══════════════════════════════════════════════════════════
#  方案 A：当前逻辑（5 次查询 + Python 计算）
# ══════════════════════════════════════════════════════════

async def check_permission_multi_query(conn, user_id, path, method):
    """模拟当前 rbac_service.check_permission 的逻辑。"""

    # 1. 查用户
    user = await conn.fetchrow(
        "SELECT id, is_superuser FROM admin_user WHERE id=$1 AND is_deleted=0", user_id
    )
    if not user:
        return False
    if user["is_superuser"] == 1:
        return True

    # 2. 查全量权限做路径匹配
    all_perms = await conn.fetch(
        "SELECT id, path, method FROM admin_permission WHERE status=1 AND is_deleted=0"
    )
    matched_ids = []
    for p in all_perms:
        if p["method"] and p["method"] != "*" and p["method"].upper() != method.upper():
            continue
        if _match_pattern(p["path"], path):
            matched_ids.append(p["id"])
    if not matched_ids:
        return False

    # 3. 查覆写
    overrides = await conn.fetch(
        "SELECT permission_id, effect FROM admin_user_permission_override "
        "WHERE user_id=$1 AND permission_id=ANY($2) AND is_deleted=0",
        user_id, matched_ids,
    )
    override_map = {o["permission_id"]: o["effect"] for o in overrides}

    # 4. 查角色
    roles = await conn.fetch(
        "SELECT role_id FROM admin_user_role WHERE user_id=$1 AND is_deleted=0", user_id
    )
    role_ids = [r["role_id"] for r in roles]

    # 5. 查角色权限
    role_perms = []
    if role_ids:
        role_perms = await conn.fetch(
            "SELECT permission_id, effect, priority FROM admin_role_permission "
            "WHERE role_id=ANY($1) AND is_deleted=0",
            role_ids,
        )
    rp_map = {}
    for rp in role_perms:
        if rp["permission_id"] not in rp_map:
            rp_map[rp["permission_id"]] = rp

    # 6. Python 计算
    matched_rps = []
    for pid in matched_ids:
        if pid in override_map:
            return override_map[pid] == "GRANT"
        if pid in rp_map:
            matched_rps.append(rp_map[pid])

    if not matched_rps:
        return False

    matched_rps.sort(key=lambda r: (-(r["priority"] or 0), 0 if r["effect"] == "DENY" else 1))
    return matched_rps[0]["effect"] == "GRANT"


def _match_pattern(pattern, path):
    if not pattern or not path:
        return False
    if "**" in pattern:
        idx = pattern.index("**")
        prefix = pattern[:idx].rstrip("/")
        return path == prefix or path.startswith(pattern[:idx])
    if "*" in pattern:
        import re
        regex = pattern.replace("*", "[^/]*")
        return bool(re.match(f"^{regex}$", path))
    return pattern == path


# ══════════════════════════════════════════════════════════
#  方案 B：单 SQL（把计算全部推到数据库）
# ══════════════════════════════════════════════════════════

SINGLE_SQL = """
WITH user_check AS (
    SELECT id, is_superuser
    FROM admin_user
    WHERE id = $1 AND is_deleted = 0
),
user_roles AS (
    SELECT role_id
    FROM admin_user_role
    WHERE user_id = $1 AND is_deleted = 0
),
role_perms AS (
    SELECT rp.permission_id, rp.effect, rp.priority
    FROM admin_role_permission rp
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE rp.is_deleted = 0
),
user_overrides AS (
    SELECT permission_id, effect
    FROM admin_user_permission_override
    WHERE user_id = $1 AND is_deleted = 0
),
matched_perms AS (
    SELECT id
    FROM admin_permission
    WHERE status = 1 AND is_deleted = 0
      AND (method IS NULL OR method = '*' OR UPPER(method) = UPPER($3))
      AND (
          -- 精确匹配
          path = $2
          -- /** 通配符匹配
          OR (path LIKE '%/**' AND (
              $2 = RTRIM(SUBSTRING(path FROM 1 FOR POSITION('**' IN path) - 1), '/')
              OR $2 LIKE SUBSTRING(path FROM 1 FOR POSITION('**' IN path) - 1) || '%'
          ))
          -- /* 通配符匹配（单层）
          OR (path LIKE '%/*' AND path NOT LIKE '%/**' AND (
              $2 ~ ('^' || REPLACE(REPLACE(path, '*', '[^/]*'), '/', '\\/') || '$')
          ))
      )
)
SELECT
    uc.is_superuser,
    COALESCE(
        -- 优先用覆写
        (SELECT uo.effect FROM user_overrides uo
         JOIN matched_perms mp ON uo.permission_id = mp.id
         LIMIT 1),
        -- 否则用角色权限（priority DESC, DENY 优先）
        (SELECT rp.effect FROM role_perms rp
         JOIN matched_perms mp ON rp.permission_id = mp.id
         ORDER BY rp.priority DESC NULLS LAST, CASE WHEN rp.effect='DENY' THEN 0 ELSE 1 END
         LIMIT 1)
    ) AS final_effect,
    EXISTS(SELECT 1 FROM matched_perms) AS has_match
FROM user_check uc;
"""


async def check_permission_single_sql(conn, user_id, path, method):
    """单 SQL 方案。"""
    row = await conn.fetchrow(SINGLE_SQL, user_id, path, method)
    if not row:
        return False
    if row["is_superuser"] == 1:
        return True
    if not row["has_match"]:
        return False
    return row["final_effect"] == "GRANT"


# ══════════════════════════════════════════════════════════
#  Benchmark
# ══════════════════════════════════════════════════════════

async def bench(name, func, conn, rounds):
    # 预热
    result = await func(conn, TEST_USER_ID, TEST_PATH, TEST_METHOD)

    times = []
    for _ in range(rounds):
        t0 = time.perf_counter()
        r = await func(conn, TEST_USER_ID, TEST_PATH, TEST_METHOD)
        times.append((time.perf_counter() - t0) * 1000)

    avg = sum(times) / len(times)
    mn = min(times)
    mx = max(times)
    p50 = sorted(times)[len(times) // 2]
    print(f"  [{name}]")
    print(f"    result={result}  rounds={rounds}")
    print(f"    avg={avg:.1f}ms  min={mn:.1f}ms  max={mx:.1f}ms  p50={p50:.1f}ms")
    return avg


async def main():
    conn = await get_conn()

    print("=" * 60)
    print(f"  Permission Check Benchmark")
    print(f"  user_id={TEST_USER_ID}  path={TEST_PATH}  method={TEST_METHOD}")
    print("=" * 60)
    print()

    avg_a = await bench("Multi-Query (current)", check_permission_multi_query, conn, ROUNDS)
    print()
    avg_b = await bench("Single-SQL (proposed)", check_permission_single_sql, conn, ROUNDS)

    print()
    print(f"  Speedup: {avg_a / avg_b:.1f}x" if avg_b > 0 else "  N/A")

    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
