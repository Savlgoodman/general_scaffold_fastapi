"""重置 admin 密码为 admin123（BCrypt）"""
import asyncio, sys
sys.path.insert(0, ".")
import asyncpg, bcrypt
from app.config import get_settings

async def main():
    s = get_settings()
    conn = await asyncpg.connect(host=s.db_host, port=s.db_port, user=s.db_username, password=s.db_password, database=s.db_name)
    hashed = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode("utf-8")
    await conn.execute("UPDATE admin_user SET password = $1 WHERE username = 'admin'", hashed)
    # verify
    row = await conn.fetchrow("SELECT password FROM admin_user WHERE username = 'admin'")
    ok = bcrypt.checkpw(b"admin123", row["password"].encode("utf-8"))
    print(f"Password reset. Verify: {ok}")
    await conn.close()

asyncio.run(main())
