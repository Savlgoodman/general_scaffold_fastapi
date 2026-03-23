# General Scaffold Spring

通用后台管理系统脚手架，基于 Spring Boot + React 前后端分离架构，开箱即用的 RBAC 权限管理系统。

## 技术栈

### 后端

- **Java 17** + **Spring Boot 3**
- **MyBatis-Plus** — ORM 框架，自动分页、逻辑删除
- **PostgreSQL** — 主数据库
- **Redis** — Token 黑名单、验证码、登录失败计数
- **Spring Security** + **JWT** — 认证与授权（Access Token + Refresh Token）
- **Flyway** — 数据库版本迁移
- **SpringDoc OpenAPI** — API 文档自动生成

### 前端

- **React 18** + **TypeScript**
- **Vite** — 构建工具
- **shadcn/ui** + **Tailwind CSS** — UI 组件库
- **Zustand** — 状态管理
- **Axios** + **Orval** — HTTP 请求，从 OpenAPI 自动生成 API 代码
- **@dnd-kit** — 拖拽排序
- **React Router v6** — 路由

## 项目结构

```
general_scaffold_spring/
├── admin-backend/          # Spring Boot 后端
│   ├── src/main/java/      # Java 源码
│   ├── src/main/resources/
│   │   ├── db/migration/   # Flyway 迁移脚本
│   │   └── application.yml # 配置文件
│   └── pom.xml
├── admin-frontend/         # React 前端
│   ├── src/
│   │   ├── api/generated/  # Orval 自动生成的 API 代码
│   │   ├── components/     # 通用组件（ui/layout/auth/skeletons）
│   │   ├── pages/          # 页面组件
│   │   ├── store/          # Zustand 状态管理
│   │   ├── routes.tsx      # 路由配置（单一数据源）
│   │   └── App.tsx         # 路由注册
│   └── package.json
├── docs/                   # 项目文档
├── CLAUDE.md               # AI 开发指导
└── README.md
```

## 核心功能

### RBAC 权限管理

- **用户管理** — CRUD、角色分配、权限覆盖
- **角色管理** — CRUD、权限分配、菜单分配
- **权限管理** — 按组分类的 API 权限，支持同步脚本自动生成
- **菜单管理** — 树形菜单 CRUD、拖拽排序、角色-菜单关联

### 动态菜单

- 登录时后端返回用户可见菜单树，前端动态渲染侧边栏
- 超级管理员支持「开发者模式」toggle，显示所有前端路由页面
- 目录覆盖：角色授权目录后，自动拥有目录下所有子菜单权限

### 认证与安全

- JWT 双 Token 机制（Access Token 30分钟 + Refresh Token 7天）
- Access Token 过期自动刷新，用户无感知
- Refresh Token 也过期时，提示「登录失效！请重新登录」并跳转登录页
- 验证码登录、登录失败锁定（5次失败锁15分钟）
- Token 黑名单（登出即失效）

### 用户详情

- 查看用户最终菜单权限和 API 权限状态
- 每项标注来源（超管 / 角色名 / 目录覆盖 / 用户覆盖）

### 前端体验

- 骨架屏加载（所有页面和对话框）
- 亮色 / 暗色 / 暖色主题切换
- 路由级权限控制 + 403 无权限页面
- 可折叠侧边栏

## 快速开始

### 环境要求

- Java 17+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 后端启动

```bash
cd admin-backend

# 配置数据库和 Redis 连接
cp src/main/resources/application-template.yml src/main/resources/application-dev.yml
# 编辑 application-dev.yml 填写数据库和 Redis 连接信息

# 启动（自动执行 Flyway 迁移）
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

默认管理员账号：`admin` / `admin123`

### 前端启动

```bash
cd admin-frontend
npm install

# 生成 API 代码（需要后端已启动）
npm run generate:api

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### API 文档

后端启动后访问 http://localhost:8080/swagger-ui.html

## 开发流程

1. **后端开发接口** — 编写 Controller/Service/VO/DTO，标注 OpenAPI 注解
2. **编译验证** — `mvn compile`
3. **生成前端 API** — `npm run generate:api`（Orval 从 OpenAPI 自动生成）
4. **前端对接** — 使用 `src/api/generated/` 中的函数和类型

### 新增页面

1. 创建页面组件 `src/pages/XxxPage.tsx`
2. 在 `src/routes.tsx` 的 `appRoutes` 数组中添加一条
3. 开发者模式下即可访问调试
4. 后端 `admin_menu` 表中插入菜单记录，分配给角色

详细开发指导参见 [CLAUDE.md](./CLAUDE.md) 和 [docs/](./docs/)。

## License

MIT
