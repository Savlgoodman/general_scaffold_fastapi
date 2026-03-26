"""用户列表接口全链路耗时分析。

需要后端运行中。从 Redis 读取验证码自动登录，然后对 listUsers 接口做详细计时。
"""
import asyncio
import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
import redis

from app.config import get_settings

settings = get_settings()
BASE = "http://127.0.0.1:8000"

r = redis.Redis(
    host=settings.redis_host, port=settings.redis_port,
    password=settings.redis_password or None, db=settings.redis_db,
    decode_responses=True,
)


def login() -> str:
    """登录并返回 accessToken。"""
    cap = httpx.get(f"{BASE}/api/admin/auth/captcha").json()["data"]
    code = r.get(f"captcha:{cap['captchaKey']}")
    resp = httpx.post(f"{BASE}/api/admin/auth/login", json={
        "username": "admin", "password": "admin123",
        "captchaKey": cap["captchaKey"], "captchaCode": code,
    })
    data = resp.json()
    if data["code"] != 200:
        print(f"Login failed: {data}")
        sys.exit(1)
    return data["data"]["accessToken"]


def bench(token: str, rounds: int = 10):
    """对 listUsers 接口做多轮计时。"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE}/api/admin/admin-users?pageNum=1&pageSize=10"

    print(f"\n{'='*60}")
    print(f"  Benchmark: GET /api/admin/admin-users (x{rounds})")
    print(f"{'='*60}\n")

    # 预热（第一次可能触发连接池创建、权限缓存写入）
    print("[Warmup]")
    t0 = time.perf_counter()
    resp = httpx.get(url, headers=headers)
    t1 = time.perf_counter()
    print(f"  warmup: {(t1-t0)*1000:.1f}ms  status={resp.status_code}  code={resp.json()['code']}")

    # 正式测试
    print(f"\n[Benchmark x{rounds}]")
    times = []
    for i in range(rounds):
        t0 = time.perf_counter()
        resp = httpx.get(url, headers=headers)
        t1 = time.perf_counter()
        ms = (t1 - t0) * 1000
        times.append(ms)
        print(f"  #{i+1:2d}: {ms:7.1f}ms")

    print(f"\n[Result]")
    print(f"  min:  {min(times):.1f}ms")
    print(f"  max:  {max(times):.1f}ms")
    print(f"  avg:  {sum(times)/len(times):.1f}ms")
    print(f"  p50:  {sorted(times)[len(times)//2]:.1f}ms")
    print(f"  p95:  {sorted(times)[int(len(times)*0.95)]:.1f}ms")


def bench_server_side(token: str):
    """触发一次请求，让服务端打印各阶段耗时。"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE}/api/admin/admin-users?pageNum=1&pageSize=10&_bench=1"

    print(f"\n{'='*60}")
    print(f"  Server-side timing (check server console)")
    print(f"{'='*60}\n")

    resp = httpx.get(url, headers=headers)
    print(f"  status={resp.status_code}  code={resp.json()['code']}")
    print(f"  (See server console for detailed timing)")


if __name__ == "__main__":
    # 清��可能的���录锁定
    for k in r.keys("login:fail:*"):
        r.delete(k)

    token = login()
    print(f"[Login OK] token={token[:20]}...")

    bench(token, rounds=15)
