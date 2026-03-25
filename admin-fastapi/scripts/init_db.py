"""从 Java Flyway 迁移脚本初始化 scaffold_fastapi_dev 数据库。

用法：python scripts/init_db.py
"""

import asyncio
import sys
from pathlib import Path

import asyncpg

# 项目根目录加入 path 以便导入 config
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import get_settings

MIGRATION_DIR = Path(__file__).resolve().parent.parent.parent / "admin-backend" / "src" / "main" / "resources" / "db" / "migration"

# 按版本号排序
MIGRATION_FILES = sorted(
    MIGRATION_DIR.glob("V*.sql"),
    key=lambda f: int(f.stem.split("__")[0].replace("V", "")),
)


async def main():
    settings = get_settings()
    print(f"Connecting to {settings.db_host}:{settings.db_port}/{settings.db_name}...")

    conn = await asyncpg.connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_username,
        password=settings.db_password,
        database=settings.db_name,
    )

    print(f"Found {len(MIGRATION_FILES)} migration files.\n")

    for f in MIGRATION_FILES:
        sql = f.read_text(encoding="utf-8")
        print(f"  Running {f.name}...", end=" ")
        try:
            await conn.execute(sql)
            print("OK")
        except asyncpg.exceptions.DuplicateTableError as e:
            print(f"SKIP (table already exists)")
        except asyncpg.exceptions.DuplicateObjectError as e:
            print(f"SKIP (object already exists)")
        except Exception as e:
            print(f"ERROR: {e}")
            # 继续执行后续脚本

    # 检查 admin 用户是否存在，没有则创建默认管理员
    admin = await conn.fetchrow("SELECT id FROM admin_user WHERE username = 'admin' AND is_deleted = 0")
    if admin is None:
        # BCrypt hash of 'admin123' (compatible with Java BCrypt)
        import bcrypt
        hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode("utf-8")
        await conn.execute("""
            INSERT INTO admin_user (username, password, nickname, status, is_superuser, is_deleted, create_time, update_time)
            VALUES ('admin', $1, 'Administrator', 1, 1, 0, NOW(), NOW())
        """, hashed)
        print("\n  Created default admin user (admin / admin123)")
    else:
        print(f"\n  Admin user already exists (id={admin['id']})")

    await conn.close()
    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
