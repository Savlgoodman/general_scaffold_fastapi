import asyncio
import asyncpg
import bcrypt
import sys
sys.path.insert(0, ".")
from app.config import get_settings

async def main():
    s = get_settings()
    conn = await asyncpg.connect(host=s.db_host, port=s.db_port, user=s.db_username, password=s.db_password, database=s.db_name)
    row = await conn.fetchrow("SELECT id, username, password FROM admin_user WHERE username = 'admin' AND is_deleted = 0")
    if row is None:
        print("admin user not found!")
        return
    print(f"id={row['id']}, password={row['password'][:40]}...")
    ok = bcrypt.checkpw(b"admin123", row["password"].encode("utf-8"))
    print(f"bcrypt.checkpw('admin123') = {ok}")
    await conn.close()

asyncio.run(main())
