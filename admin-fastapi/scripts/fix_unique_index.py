"""将 admin_user.username 的全表唯一约束改为部分唯一索引（仅 is_deleted=0）。

这样逻辑删除后用户名可以被复用。
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import asyncpg
from app.config import get_settings


async def main():
    s = get_settings()
    conn = await asyncpg.connect(
        host=s.db_host, port=s.db_port,
        user=s.db_username, password=s.db_password,
        database=s.db_name,
    )

    # 同样处理 admin_role.code
    migrations = [
        ("admin_user", "username", "admin_user_username_key"),
        ("admin_role", "code", "admin_role_code_key"),
    ]

    for table, column, old_constraint in migrations:
        print(f"\n[{table}.{column}]")

        # 1. 删除旧的全表唯一约束
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_constraint WHERE conname = $1", old_constraint
        )
        if exists:
            await conn.execute(f"ALTER TABLE {table} DROP CONSTRAINT {old_constraint}")
            print(f"  dropped constraint {old_constraint}")
        else:
            # 也可能是唯一索引而非约束
            idx_exists = await conn.fetchval(
                "SELECT 1 FROM pg_indexes WHERE indexname = $1", old_constraint
            )
            if idx_exists:
                await conn.execute(f"DROP INDEX {old_constraint}")
                print(f"  dropped index {old_constraint}")
            else:
                print(f"  {old_constraint} not found, skipping drop")

        # 2. 创建部分唯一索引（仅 is_deleted=0）
        new_index = f"uq_{table}_{column}_active"
        await conn.execute(
            f"CREATE UNIQUE INDEX IF NOT EXISTS {new_index} "
            f"ON {table} ({column}) WHERE is_deleted = 0"
        )
        print(f"  created partial unique index {new_index}")

    await conn.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
