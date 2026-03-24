# 菜单管理

## 概述

菜单管理模块控制前端侧边栏的动态渲染，支持树形层级结构。通过角色-菜单关联实现不同用户看到不同菜单。超级管理员可开启开发者模式，直接显示所有前端路由页面。

## 数据库设计

### admin_menu 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| name | VARCHAR(100) | 菜单名称 |
| path | VARCHAR(255) | 前端路由路径（如 `/system/user`） |
| icon | VARCHAR(100) | 图标名（对应 lucide-react 组件名，如 `Users`） |
| component | VARCHAR(255) | 前端组件路径（预留字段） |
| parent_id | BIGINT | 父级菜单 ID，0 为顶级 |
| type | VARCHAR(20) | `directory`-目录 / `menu`-菜单 / `button`-按钮 |
| sort | INTEGER | 排序权重，越小越靠前 |
| is_deleted | INTEGER | 逻辑删除 |

### admin_role_menu 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| role_id | BIGINT | 角色 ID |
| menu_id | BIGINT | 菜单 ID |
| is_deleted | INTEGER | 逻辑删除 |

### 关系链路

```
用户 → admin_user_role → 角色 → admin_role_menu → 菜单
```

## 后端接口

| 方法 | 路径 | operationId | 说明 |
|------|------|-------------|------|
| GET | `/api/admin/menus/tree` | `getMenuTree` | 全量菜单树 |
| GET | `/api/admin/menus/user-tree` | `getUserMenuTree` | 当前用户可见菜单树 |
| GET | `/api/admin/menus/{id}` | `getMenuDetail` | 菜单详情 |
| POST | `/api/admin/menus` | `createMenu` | 创建菜单 |
| PUT | `/api/admin/menus/{id}` | `updateMenu` | 更新菜单 |
| DELETE | `/api/admin/menus/{id}` | `deleteMenu` | 删除菜单（递归删除子菜单） |

### 登录接口变更

登录接口 `POST /api/admin/auth/login` 返回的 `LoginVO` 新增字段：

- `menus: List<MenuVO>` — 用户可见菜单树（超管返回全量，普通用户返回角色关联菜单）
- `user.isSuperuser: Integer` — 是否超级管理员（1-是 0-否）

刷新 Token 接口 `POST /api/admin/auth/refresh` 同样返回最新的 menus。

## 前端实现

### 菜单渲染逻辑

```
登录 → LoginVO.menus 存入 auth store → AppSidebar 读取渲染
```

| 模式 | 条件 | 菜单来源 |
|------|------|----------|
| 开发者模式 | `isSuperuser === 1` 且 devMode 开启 | `src/routes.tsx` 中的 `appRoutes`（全部前端路由） |
| 普通模式 | 其他情况 | auth store 中的 `menus`（后端返回的菜单树） |

### 关键文件

| 文件 | 职责 |
|------|------|
| `src/routes.tsx` | 路由配置单一数据源（path、title、icon、element） |
| `src/App.tsx` | 遍历 `appRoutes` 注册路由 |
| `src/store/auth.ts` | 存储 menus、devMode、tokens |
| `src/components/layout/AppSidebar.tsx` | 侧边栏动态菜单渲染 |
| `src/components/layout/Header.tsx` | 开发者模式 toggle（超管可见） |
| `src/components/auth/ProtectedRoute.tsx` | 路由权限检查，无权限显示 403 |
| `src/pages/system/MenuManagement.tsx` | 菜单管理 CRUD 页面 |
| `src/pages/Forbidden.tsx` | 403 无权限页面 |

### 图标映射

菜单的 `icon` 字段值需对应 `AppSidebar.tsx` 中 `iconMap` 注册的 lucide-react 组件名。当前已注册：

```
LayoutDashboard, Users, Shield, Menu, Key, FileText, LogIn,
AlertCircle, Settings, Globe, Home, Database, Bell, BookOpen, Folder
```

新增图标需在 `iconMap` 中添加映射。

### 路由权限控制

`ProtectedRoute` 组件在渲染前检查当前路径是否在用户菜单中：

- 超管 + 开发者模式 → 放行所有路由
- `/` 根路径 → 始终放行
- 其他路径 → 检查是否在 `menus` 的 path 集合中，不在则显示 403

## Token 刷新机制

`src/api/custom-instance.ts` 实现了透明的 token 自动刷新：

1. 请求收到 401 → 用 refresh token 调用刷新接口
2. 刷新成功 → 更新 store 中的 tokens 和 menus → 自动重试原请求
3. 刷新失败 → 清除登录状态 → toast 提示「登录失效！请重新登录」→ 跳转登录页
4. 并发 401 处理：加锁机制，多个请求同时 401 只刷新一次，其余排队等待新 token

## 新增页面流程

1. 创建页面组件 `src/pages/XxxPage.tsx`
2. 在 `src/routes.tsx` 的 `appRoutes` 数组中添加一条
3. 开发者模式下即可访问和调试
4. 确认后在 `admin_menu` 表中插入菜单记录，通过 `admin_role_menu` 关联到角色
