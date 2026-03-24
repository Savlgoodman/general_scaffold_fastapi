# 项目文档中心

本目录（`docs/`）存放项目所有技术文档。新增文档前请先阅读本文件，了解命名规范和分类规则。

---

## 文档编写规范

### 命名规则

所有文档以 **`{类型前缀}_{模块}_{描述}.md`** 格式命名，全大写下划线分隔。

| 前缀 | 用途 | 命名示例 |
|------|------|----------|
| `SYSTEM_` | 系统功能总结/现状描述 | `SYSTEM_RBAC_SUMMARY.md` |
| `UPDATE_` | 功能升级/变更规划 | `UPDATE_NOTICE_AUTH_UPGRADE.md` |
| `DESIGN_` | 架构设计/技术方案 | `DESIGN_DATABASE_SCHEMA.md` |
| `GUIDE_` | 操作指南/部署手册 | `GUIDE_DEPLOYMENT.md` |
| `API_` | 接口文档/协议说明 | `API_AUTH_ENDPOINTS.md` |
| `TROUBLESHOOT_` | 故障排查/问题记录 | `TROUBLESHOOT_JWT_TOKEN_ISSUES.md` |

### 新建文档流程

1. **先判断类型** — 根据文档目的选择上表中的前缀
2. **检查是否已有同类文档** — 查看下方目录索引，避免重复
3. **按命名规则创建文件** — 放入 `docs/` 目录
4. **更新本文件的目录索引** — 在对应分类的一级标题下添加条目

### 文档内容规范

- 文档开头必须有一级标题，简明扼要说明文档主题
- 写明 **创建日期** 和 **最后更新日期**
- 涉及代码变更的文档需标注 **影响范围**（哪些模块/文件）
- 使用中文撰写，代码/命令/路径保持英文原样
- 保持文档与代码同步，代码变更后及时更新对应文档

---

## SYSTEM — 系统功能总结

> 描述系统各模块的现状、功能范围、数据模型等。

- [SYSTEM_MENU_MANAGEMENT.md](./SYSTEM_MENU_MANAGEMENT.md) — 菜单管理系统：树形菜单设计、角色关联、动画渲染、开发者模式

---

## UPDATE — 功能升级/变更

> 记录功能升级的规划、变更内容、迁移方案等。

- [UPDATE_NOTIFICATION_AND_MONITOR_SYSTEM.md](./UPDATE_NOTIFICATION_AND_MONITOR_SYSTEM.md) — 通知公告及系统监控功能：后端接口设计、前端页面规划、实施步骤
- [UPDATE_MINIO_FILE_STORAGE.md](./UPDATE_MINIO_FILE_STORAGE.md) — MinIO 对象存储集成：文件上传、头像管理、桶存储后台管理

---

## DESIGN — 架构设计

> 技术方案、数据库设计、系统架构等设计类文档。

- [DESIGN_BACKEND_MIDDLEWARE_REFACTOR.md](./DESIGN_BACKEND_MIDDLEWARE_REFACTOR.md) — 后端中间件重构：异常处理、日志优化、JWT 性能、安全白名单统一
- [DESIGN_LOGGING_SYSTEM_IMPLEMENTATION.md](./DESIGN_LOGGING_SYSTEM_IMPLEMENTATION.md) — 日志体系实现方案：API 日志、操作审计、异常日志、异步基础设施
- [DESIGN_ONLINE_USER_SESSION_MANAGEMENT.md](./DESIGN_ONLINE_USER_SESSION_MANAGEMENT.md) — 在线用户会话管理：Refresh 心跳检测、强制下线、Redis 会话存储

---

## GUIDE — 操作指南

> 部署手册、开发环境搭建、常用操作流程等。

（暂无文档）

---

## API — 接口文档

> 接口协议、数据格式、第三方集成等 API 相关文档。

（暂无文档）

---

## TROUBLESHOOT — 故障排查

> 已知问题、排查思路、解决方案的记录。

（暂无文档）
