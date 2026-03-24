# 系统设置功能设计方案

> 创建日期：2026-03-25
> 最后更新：2026-03-25

## 概述

新增「系统设置」页面，允许超级管理员通过界面配置系统级参数（站点名称、Logo、登录策略等），取代当前硬编码在前端组件和后端配置文件中的固定值。

**影响范围：**

| 层级 | 涉及文件/模块 |
|------|---------------|
| 数据库 | 新增 `admin_system_config` 表（Flyway V10） |
| 后端 | 新增 Controller / Service / Mapper / VO / DTO |
| 前端 | 新增 `SystemSettings.tsx` 页面，改造 Sidebar Header / HTML title / favicon |

---

## 一、数据库设计

### 表结构：`admin_system_config`

采用 **Key-Value** 模式，每行存一个配置项，灵活扩展，无需加列。

```sql
CREATE TABLE admin_system_config (
    id          BIGSERIAL PRIMARY KEY,
    config_key  VARCHAR(100) NOT NULL UNIQUE,   -- 配置键（唯一标识）
    config_value TEXT,                           -- 配置值（支持长文本/JSON）
    description VARCHAR(255),                    -- 配置说明
    group_name  VARCHAR(50)  NOT NULL DEFAULT 'basic', -- 分组名
    sort        INTEGER      DEFAULT 0,          -- 组内排序
    is_deleted  INTEGER      DEFAULT 0,
    create_time TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE  admin_system_config IS '系统配置表';
COMMENT ON COLUMN admin_system_config.config_key   IS '配置键，全局唯一';
COMMENT ON COLUMN admin_system_config.config_value IS '配置值，支持纯文本或 JSON';
COMMENT ON COLUMN admin_system_config.group_name   IS '配置分组：basic / security / appearance';
```

### 初始配置项

#### 基础设置（group: `basic`）

| config_key | 默认值 | 说明 |
|------------|--------|------|
| `site_title` | `Admin Platform` | 浏览器标签页标题 |
| `site_name` | `Admin` | 侧边栏 Header 主标题 |
| `site_subtitle` | `管理系统` | 侧边栏 Header 副标题 |
| `site_logo` | `""` | 站点 Logo URL（为空时使用默认图标） |
| `site_favicon` | `""` | 浏览器 Favicon URL（为空时使用默认） |
| `site_footer` | `© 2026 Admin Platform` | 页脚版权文字 |

#### 安全设置（group: `security`）

| config_key | 默认值 | 说明 |
|------------|--------|------|
| `login_captcha_enabled` | `true` | 登录是否需要验证码 |
| `login_max_retry` | `5` | 登录最大失败次数（达到后锁定） |
| `login_lock_duration` | `30` | 账号锁定时长（分钟） |
| `password_min_length` | `6` | 密码最小长度 |
| `session_timeout` | `30` | 会话超时时间（分钟，access token TTL） |

#### 外观设置（group: `appearance`）

| config_key | 默认值 | 说明 |
|------------|--------|------|
| `default_theme` | `system` | 新用户默认主题（light / dark / warm / system） |
| `sidebar_collapsed` | `false` | 侧边栏默认是否收起 |
| `login_bg_image` | `""` | 登录页背景图 URL |
| `login_welcome_text` | `欢迎回来` | 登录页欢迎文字 |

---

## 二、后端设计

### API 接口

| 方法 | 路径 | operationId | 说明 | 权限 |
|------|------|-------------|------|------|
| GET | `/api/admin/system-config` | `listSystemConfigs` | 查询所有配置（按分组） | 超级管理员 |
| PUT | `/api/admin/system-config` | `updateSystemConfigs` | 批量更新配置 | 超级管理员 |
| GET | `/api/admin/system-config/public` | `getPublicConfigs` | 获取公开配置（无需登录） | 无 |

#### 公开配置说明

`getPublicConfigs` 接口**不需要认证**，返回前端渲染所需的基础信息（站点名称、Logo、Favicon、登录页配置等），用于：
- 登录页展示站点名称和背景图
- 浏览器标签页标题和 Favicon
- 侧边栏 Header 品牌信息

**公开的 config_key 白名单：** `site_title`、`site_name`、`site_subtitle`、`site_logo`、`site_favicon`、`site_footer`、`login_bg_image`、`login_welcome_text`、`default_theme`、`login_captcha_enabled`

#### 请求/响应模型

```java
// 查询响应 - 按分组返回
@Schema(description = "系统配置分组")
public class SystemConfigGroupVO {
    @Schema(description = "分组名")
    private String groupName;

    @Schema(description = "配置项列表")
    private List<SystemConfigItemVO> items;
}

@Schema(description = "系统配置项")
public class SystemConfigItemVO {
    @Schema(description = "配置键")
    private String configKey;

    @Schema(description = "配置值")
    private String configValue;

    @Schema(description = "配置说明")
    private String description;
}

// 批量更新请求
@Schema(description = "批量更新系统配置")
public class UpdateSystemConfigDTO {
    @Schema(description = "配置项列表")
    @NotEmpty
    private List<ConfigEntry> configs;

    @Schema(description = "单条配置")
    public static class UpdateSystemConfigEntry {
        @Schema(description = "配置键")
        @NotBlank
        private String configKey;

        @Schema(description = "配置值")
        private String configValue;
    }
}
```

### 缓存策略

- **Redis 缓存**：以 `system:config:{config_key}` 为 key 缓存每个配置值，TTL 1 小时
- **更新时清除**：调用 `updateSystemConfigs` 时删除对应 key 的缓存
- **Service 层封装**：提供 `getConfigValue(String key)` 方法，优先读缓存，miss 时读库并回填
- **公开接口可缓存**：`getPublicConfigs` 整体缓存，key 为 `system:config:public_bundle`

### 操作审计

批量更新接口标注 `@OperationLog(module = "系统设置", type = OperationType.UPDATE)`。

---

## 三、前端设计

### 页面路由

```typescript
// src/routes.tsx
{ path: "/system/settings", title: "系统设置", icon: "Settings", element: <SystemSettings /> }
```

### 页面布局

页面分为多个 Tab 或 Card 分区，对应后端 `group_name`：

```
┌─────────────────────────────────────────────────┐
│  系统设置                                        │
│  管理系统全局配置                                  │
├──────────┬──────────┬──────────┐                 │
│ 基础设置  │ 安全设置  │ 外观设置  │  ← Tabs        │
├──────────┴──────────┴──────────┘                 │
│                                                  │
│  ┌─ 基础设置 ────────────────────────────────┐   │
│  │                                           │   │
│  │  站点名称    [ Admin              ]       │   │
│  │  站点副标题  [ 管理系统            ]       │   │
│  │  页面标题    [ Admin Platform      ]       │   │
│  │  站点 Logo   [ 上传/选择 ]  ┌──────┐      │   │
│  │                            │ 预览  │      │   │
│  │                            └──────┘      │   │
│  │  站点图标    [ 上传/选择 ]  [16x16预览]   │   │
│  │  页脚文字    [ © 2026 ...          ]       │   │
│  │                                           │   │
│  │            [ 恢复默认 ]  [ 保存 ]          │   │
│  └───────────────────────────────────────────┘   │
│                                                  │
│  ┌─ 安全设置 ────────────────────────────────┐   │
│  │                                           │   │
│  │  登录验证码    [开关]                      │   │
│  │  最大失败次数  [ 5   ]  次                 │   │
│  │  锁定时长      [ 30  ]  分钟              │   │
│  │  密码最小长度  [ 6   ]  位                 │   │
│  │  会话超时      [ 30  ]  分钟              │   │
│  │                                           │   │
│  │            [ 恢复默认 ]  [ 保存 ]          │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 交互说明

1. **加载**：进入页面请求 `listSystemConfigs`，按 `groupName` 分组渲染 Tabs
2. **编辑**：表单实时编辑，修改项高亮标记
3. **保存**：每个分组独立保存，点击「保存」调用 `updateSystemConfigs` 只提交当前分组变更项
4. **恢复默认**：将当前分组所有配置重置为初始默认值（前端维护默认值映射）
5. **Logo/Favicon 上传**：复用已有文件上传接口 `POST /api/admin/files/upload`，上传后将 URL 写入 config_value
6. **实时预览**：修改站点名称时，侧边栏标题实时变化（通过全局状态）

### 全局状态接入

新增 Zustand store `src/store/site-config.ts`：

```typescript
interface SiteConfig {
  siteTitle: string
  siteName: string
  siteSubtitle: string
  siteLogo: string
  siteFavicon: string
  siteFooter: string
  loginCaptchaEnabled: boolean
  loginWelcomeText: string
  loginBgImage: string
  defaultTheme: string
}

interface SiteConfigStore {
  config: SiteConfig
  loaded: boolean
  fetchConfig: () => Promise<void>  // 调用 getPublicConfigs
}
```

**消费方改造：**

| 组件 | 当前实现 | 改造后 |
|------|---------|--------|
| `AppSidebar.tsx` | 硬编码 "Admin" + "管理系统" | 读取 `siteName` + `siteSubtitle` |
| `AppSidebar.tsx` | 硬编码 `<LayoutDashboard>` 图标 | 读取 `siteLogo`，有值时展示 `<img>`，否则保留默认图标 |
| `index.html` | 静态 `<title>Admin Platform</title>` | 由 `App.tsx` ��过 `document.title` 动态设置 |
| 登录页 | 固定欢迎文字 | 读取 `loginWelcomeText` + `loginBgImage` |

---

## 四、实施步骤

### 第 1 步：数据库迁移

- 创建 `V10__add_system_config.sql`
- 建表 + 插入全部初始配置项

### 第 2 步：后端接口

1. 创建 `SystemConfig` 实体类（继承 BaseEntity）
2. 创建 `SystemConfigMapper`
3. 创建 `SystemConfigService` / `SystemConfigServiceImpl`
   - `listAllGrouped()` → 按 group_name 分组返回
   - `getPublicConfigs()` → 返回白名单配置
   - `batchUpdate(UpdateSystemConfigDTO)` → 批量更新 + 清缓存
   - `getConfigValue(String key)` → 带 Redis 缓存的单值查询
4. 创建 `SystemConfigController`（3 个接口）
5. 创建 VO / DTO 类
6. `/api/admin/system-config/public` 加入安全白名单（`SecurityConstants.PUBLIC_PATHS`）
7. `mvn compile` 验证

### 第 3 步：前端页面

1. 用户运行 `npm run generate:api` 生成前端 API 代码
2. 创建 `src/store/site-config.ts`（Zustand store）
3. 创建 `src/pages/system/SystemSettings.tsx`（Tabs 表单页）
4. 在 `src/routes.tsx` 注册路由
5. 改造 `AppSidebar.tsx` — 读取 store 替换硬编码
6. 改造 `App.tsx` — 启动时 fetch 公开配置，设置 document.title 和 favicon
7. `npx tsc --noEmit` 验证

### 第 4 步：后端菜单数据

- 在 `admin_menu` 表中插入「系统设置」菜单记录，关联给管理员角色

---

## 五、注意事项

1. **KV 表不继承 BaseEntity 的 `is_deleted`**：配置项不做软删除，只做更新；但保留 `is_deleted` 字段以符合项目统一规范
2. **公开接口安全性**：`getPublicConfigs` 只返回白名单内的配置，密码策略的具体值（如 `password_min_length`）可以公开（前端校验需要），但 `session_timeout` 等敏感值不公开
3. **内部类命名**：DTO 内部类统一加父类前缀，如 `UpdateSystemConfigEntry`，避免 orval 合并
4. **后端配置优先级**：安全相关设置（如验证码开关、锁定策略）后端 Service 层应读取数据库配置而非 `application.yml` 硬编码，实现动态生效
