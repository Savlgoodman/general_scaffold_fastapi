"""端到端认证流程测试。

需要先启动服务：uvicorn app.main:app --reload --port 8000
测试完整流程：验证码 → 登录 → /me → 刷新Token → 登出 → 验证Token失效
"""

import sys
import redis
import httpx

BASE = "http://127.0.0.1:8000"
PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

# 连接 Redis 读取验证码真实值
from app.config import get_settings
settings = get_settings()
r = redis.Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    password=settings.redis_password or None,
    db=settings.redis_db,
    decode_responses=True,
)

client = httpx.Client(base_url=BASE, timeout=10)
errors = []


def test(name: str, passed: bool, detail: str = ""):
    status = PASS if passed else FAIL
    print(f"  [{status}] {name}" + (f"  ({detail})" if detail else ""))
    if not passed:
        errors.append(name)


print("=" * 60)
print("  E2E Auth Flow Test")
print("=" * 60)

# ── 1. Health ─────────────────────────────────────────────
print("\n[1] Health Check")
resp = client.get("/health")
data = resp.json()
test("GET /health returns 200", data["code"] == 200, f"data={data['data']}")

# ── 2. Captcha ────────────────────────────────────────────
print("\n[2] Captcha")
resp = client.get("/api/admin/auth/captcha")
cap = resp.json()
test("GET /captcha returns 200", cap["code"] == 200)
cap_data = cap["data"]
test("captchaKey exists", bool(cap_data.get("captchaKey")))
test("captchaImage is base64 png", cap_data.get("captchaImage", "").startswith("data:image/png"))

# 从 Redis 读取真实验证码
captcha_key = cap_data["captchaKey"]
real_code = r.get(f"captcha:{captcha_key}")
test("captcha stored in Redis", real_code is not None, f"code={real_code}")

# ── 3. Login (wrong captcha) ─────────────────────────────
print("\n[3] Login - Wrong Captcha")
resp = client.post("/api/admin/auth/login", json={
    "username": "admin", "password": "admin123",
    "captchaKey": captcha_key, "captchaCode": "WRONG",
})
data = resp.json()
test("wrong captcha returns 400", data["code"] == 400, f"msg={data['message']}")

# ── 4. Login (wrong password, need new captcha) ──────────
print("\n[4] Login - Wrong Password")
resp = client.get("/api/admin/auth/captcha")
cap2 = resp.json()["data"]
real_code2 = r.get(f"captcha:{cap2['captchaKey']}")
resp = client.post("/api/admin/auth/login", json={
    "username": "admin", "password": "wrong_password",
    "captchaKey": cap2["captchaKey"], "captchaCode": real_code2,
})
data = resp.json()
test("wrong password returns 401", data["code"] == 401, f"msg={data['message']}")

# ── 5. Login (success) ───────────────────────────────────
print("\n[5] Login - Success")
resp = client.get("/api/admin/auth/captcha")
cap3 = resp.json()["data"]
real_code3 = r.get(f"captcha:{cap3['captchaKey']}")
resp = client.post("/api/admin/auth/login", json={
    "username": "admin", "password": "admin123",
    "captchaKey": cap3["captchaKey"], "captchaCode": real_code3,
})
login_data = resp.json()
test("login returns 200", login_data["code"] == 200, f"msg={login_data['message']}")

if login_data["code"] != 200:
    print(f"\n  !!! Login failed: {login_data}")
    print("  !!! Cannot continue. Is the database connected? Does admin user exist?")
    sys.exit(1)

tokens = login_data["data"]
access_token = tokens["accessToken"]
refresh_token = tokens["refreshToken"]
test("accessToken exists", bool(access_token))
test("refreshToken exists", bool(refresh_token))
test("tokenType is Bearer", tokens.get("tokenType") == "Bearer")
test("expiresIn > 0", (tokens.get("expiresIn") or 0) > 0, f"expiresIn={tokens.get('expiresIn')}")
test("user info returned", bool(tokens.get("user")))
user = tokens.get("user", {})
test("user.username is admin", user.get("username") == "admin")
test("menus returned", isinstance(tokens.get("menus"), list), f"count={len(tokens.get('menus', []))}")

# ── 6. GET /me ────────────────────────────────────────────
print("\n[6] Get Current User (/me)")
resp = client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {access_token}"})
me_data = resp.json()
test("/me returns 200", me_data["code"] == 200)
me_user = me_data.get("data", {})
test("user.id exists", me_user.get("id") is not None, f"id={me_user.get('id')}")
test("user.username matches", me_user.get("username") == "admin")

# ── 7. /me without token ─────────────────────────────────
print("\n[7] /me Without Token")
resp = client.get("/api/admin/auth/me")
data = resp.json()
test("no token returns 401", data["code"] == 401)

# ── 8. Refresh Token ─────────────────────────────────────
print("\n[8] Refresh Token")
resp = client.post("/api/admin/auth/refresh", json={"refreshToken": refresh_token})
refresh_data = resp.json()
test("refresh returns 200", refresh_data["code"] == 200)
if refresh_data["code"] == 200:
    new_tokens = refresh_data["data"]
    new_access = new_tokens["accessToken"]
    new_refresh = new_tokens["refreshToken"]
    test("new accessToken differs", new_access != access_token)
    # refreshToken 可能相同（同秒内 JWT payload 一致），但旧 token 已加黑名单
    test("new refreshToken exists", bool(new_refresh))
    test("user info in refresh response", bool(new_tokens.get("user")))

    # old refresh token should be blacklisted
    resp = client.post("/api/admin/auth/refresh", json={"refreshToken": refresh_token})
    test("old refreshToken rejected", resp.json()["code"] == 401, f"msg={resp.json()['message']}")
else:
    new_access = access_token
    new_refresh = refresh_token
    test("refresh failed", False, f"msg={refresh_data['message']}")

# ── 9. /me with new token ────────────────────────────────
print("\n[9] /me With New Token")
resp = client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {new_access}"})
data = resp.json()
test("new token works on /me", data["code"] == 200)

# ── 10. Logout ────────────────────────────────────────────
print("\n[10] Logout")
resp = client.post("/api/admin/auth/logout", headers={"Authorization": f"Bearer {new_access}"})
data = resp.json()
test("logout returns 200", data["code"] == 200)

# ── 11. Token invalidated after logout ───────────────────
print("\n[11] Token Invalidated After Logout")
resp = client.get("/api/admin/auth/me", headers={"Authorization": f"Bearer {new_access}"})
data = resp.json()
test("old token rejected after logout", data["code"] == 401, f"msg={data['message']}")

resp = client.post("/api/admin/auth/refresh", json={"refreshToken": new_refresh})
data = resp.json()
test("refresh token rejected after logout", data["code"] == 401, f"msg={data['message']}")

# ── Summary ───────────────────────────────────────────────
print("\n" + "=" * 60)
if errors:
    print(f"  {FAIL} {len(errors)} test(s) failed: {', '.join(errors)}")
    sys.exit(1)
else:
    print(f"  {PASS} All tests passed!")
    sys.exit(0)
