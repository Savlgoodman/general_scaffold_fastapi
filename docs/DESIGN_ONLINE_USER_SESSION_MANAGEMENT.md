# 在线用户会话管理与强制下线方案

> 创建日期：2026-03-24
> 最后更新：2026-03-24

## 概述

在现有 JWT + Redis 认证体系基础上，实现在线用户列表查看和管理员强制踢人下线功能。核心思路是利用 **短有效期 Access Token + Refresh 心跳** 作为在线检测机制，避免在每次 API 请求中额外写入 Redis。

## 背景

### 现有认证架构

| 组件 | 说明 |
|------|------|
| Access Token | JWT，有效期 30 分钟（HMAC256 签名） |
| Refresh Token | JWT，有效期 7 天 |
| Token 黑名单 | Redis `token:blacklist:{token}`，TTL = token 剩余有效期 |
| Refresh Token 存储 | Redis `user:refresh_token:{userId}`，TTL = 7 天 |
| 登出机制 | 双 Token 同时拉黑 + 删除 Redis 中的 Refresh Token |
| 前端自动刷新 | `custom-instance.ts` 拦截 401 → 自动 refresh → 重试原请求（并发加锁） |

### 问题

当前系统无法得知哪些用户正在使用系统，也无法在不修改密码的情况下强制某个用户下线。

## 方案设计

### 核心思路：Refresh 心跳 = 在线检测

```
┌─────────┐     5min到期      ┌──────────┐     refresh      ┌─────────┐
│  前端    │ ──── 401 ───────→ │ 前端自动  │ ──────────────→ │  后端    │
│  请求    │                   │ refresh  │                  │ 重置TTL │
└─────────┘                   └──────────┘                  └─────────┘
                                                                 │
                                            Redis online:session:{userId}
                                            TTL 重置为 6 分钟
```

**原理：**
1. 将 Access Token 有效期从 30 分钟缩短至 **5 分钟**
2. 前端已有 401 自动 refresh 机制，活跃用户每 5 分钟自动触发一次 refresh
3. 后端在 refresh 时重置 Redis 会话的 TTL（6 分钟）
4. 用户关闭浏览器或长时间不操作 → 无 refresh → 会话 TTL 到期 → 自然"下线"

**业界参考：** Keycloak 默认即为此模式（Access Token 5 分钟 + 基于 refresh 的会话追踪）。Auth0、Spring Authorization Server 同样推荐短有效期 Access Token。

### Redis 数据结构

新增 Key：

| Key 格式 | 值 | TTL |
|----------|-----|-----|
| `online:session:{userId}` | JSON（见下方） | 6 分钟（每次 refresh 重置） |

会话数据（JSON）：

```json
{
  "userId": 1,
  "username": "admin",
  "nickname": "管理员",
  "loginIp": "192.168.1.100",
  "userAgent": "Mozilla/5.0 ...",
  "loginTime": "2026-03-24T10:30:00",
  "lastActiveTime": "2026-03-24T11:15:00",
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

`accessToken` 字段仅后端内部使用（踢人时拉黑），不暴露给前端。

### 会话生命周期

```
登录 ──→ 创建 online:session:{userId}（TTL=6min）
  │
  ├─ 用户活跃 ──→ 每5分钟自动 refresh ──→ 重置 TTL + 更新 lastActiveTime + 更新 accessToken
  │
  ├─ 用户不活跃 ──→ 无 refresh ──→ 6分钟后 TTL 到期 ──→ Key 自动删除 ──→ 下线
  │
  ├─ 主动登出 ──→ 删除 session + 拉黑双 Token
  │
  └─ 被踢下线 ──→ 拉黑 accessToken + refreshToken + 删除 session + 删除 refresh_token 存储
```

### 踢人下线流程

```
管理员点击"踢下线"
  │
  ├─ 1. 从 online:session:{userId} 取出 accessToken
  ├─ 2. 将 accessToken 加入 token:blacklist（TTL=剩余有效期）
  ├─ 3. 从 user:refresh_token:{userId} 取出 refreshToken
  ├─ 4. 将 refreshToken 加入 token:blacklist（TTL=剩余有效期）
  ├─ 5. 删除 user:refresh_token:{userId}
  └─ 6. 删除 online:session:{userId}
```

**效果：** 被踢用户下一次 API 请求立即收到 401（access token 已拉黑），且无法 refresh（refresh token 也已拉黑），前端自动跳转登录页。

### 安全约束

- 管理员**不能踢自己**（前端禁用按钮 + 后端校验）
- 踢人操作记录审计日志（`@OperationLog`）

## 影响范围

### 后端文件

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `application.yml` | 修改 | `access-expiration` 从 1800000 改为 300000 |
| `RedisKeys.java` | 修改 | 新增 `ONLINE_SESSION` 枚举值 |
| `AuthServiceImpl.java` | 修改 | login 创建会话，logout 删除会话，refreshToken 重置 TTL |
| `AuthController.java` | 修改 | login 方法传入 `HttpServletRequest` |
| `OnlineSessionData.java` | **新增** | Redis 会话数据类 |
| `OnlineUserVO.java` | **新增** | 前端返回 VO |
| `OnlineUserService.java` | **新增** | 服务接口 |
| `OnlineUserServiceImpl.java` | **新增** | 服务实现 |
| `OnlineUserController.java` | **新增** | `/api/admin/monitor/online-users` |

### 前端文件

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `OnlineUsers.tsx` | **新增** | 在线用户管理页面 |
| `routes.tsx` | 修改 | 注册 `/monitor/online` 路由 |

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/monitor/online-users` | 查看在线用户列表 |
| DELETE | `/api/admin/monitor/online-users/{userId}` | 强制用户下线 |

## 方案优势

| 对比维度 | 本方案（Refresh 心跳） | 每次请求写 Redis |
|----------|----------------------|------------------|
| Redis 写入频率 | 每 5 分钟 1 次/用户 | 每次 API 请求 |
| JWT 过滤器改动 | 无 | 需增加 Redis 写入 |
| 在线检测精度 | ~6 分钟延迟 | 实时 |
| 代码侵入性 | 仅改 AuthService | 改 JwtAuthenticationFilter（热路径） |
| 安全附加收益 | Access Token 窗口缩短至 5 分钟 | 无 |

## 注意事项

1. **Access Token 缩短的影响**：所有在线用户每 5 分钟触发一次 refresh。由于登录时间不同，请求天然错峰，不会形成洪峰。
2. **Redis `keys()` 命令**：在线用户扫描使用 `keys(online:session:*)`。管理后台用户量级通常在百级以内，可接受。若未来需扩展到千级以上，应改用 `SCAN` 命令。
3. **LoginVO.expiresIn**：需从配置动态读取（当前可能硬编码为 1800），确保前端拿到正确的过期时间。
