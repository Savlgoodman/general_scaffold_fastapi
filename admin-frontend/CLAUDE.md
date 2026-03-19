# Admin Frontend - 项目记忆

## 项目概述
后台管理系统前端脚手架，配合 Spring Boot 后端实现 RBAC 权限管理。

## 技术栈
- **框架**: React 18 + TypeScript
- **构建**: Vite（端口 3000，API 代理到 localhost:8080）
- **UI**: shadcn/ui（new-york 风格）+ Tailwind CSS
- **路由**: React Router v6
- **状态**: Zustand
- **HTTP**: Axios
- **图标**: Lucide React

## 项目约定
- 路径别名: `@/*` → `src/*`
- shadcn 组件存放: `src/components/ui/`
- 页面组件存放: `src/pages/`
- CSS 变量主题，支持亮色/暗色/暖色模式
- 后端 API 前缀: `/api/admin/*`，JWT Bearer Token 认证

## 项目结构
```
src/
├── components/
│   ├── ui/           # shadcn/ui 组件
│   ├── layout/       # 布局组件（侧边栏、顶栏等）
│   └── providers/    # Provider 组件
├── hooks/            # 自定义 Hooks
├── lib/utils.ts      # cn() 工具函数
├── pages/            # 页面组件
├── store/            # Zustand 状态管理
├── index.css         # 全局样式 & Tailwind 指令
├── App.tsx           # 路由配置
└── main.tsx          # 入口
```

## 主题系统

### 架构

```
CSS 变量 (:root / .dark / .warm)  →  Tailwind 配置映射  →  组件使用
```

主题色定义在两处：
1. `src/index.css` - CSS 变量定义
2. `tailwind.config.js` - Tailwind 工具类映射

### CSS 变量说明

所有颜色定义在 `src/index.css` 的 `:root` 中，使用 HSL 格式：

```css
:root {
  --background: 30 45.45% 95.69%;     /* 米白背景 */
  --foreground: 230 90% 7.84%;       /* 深蓝标题 */
  --primary: 39.66 26.7% 43.33%;     /* 暖棕主色 */
  --primary-foreground: 60 100% 99.8%;
  --secondary: 31.11 39.13% 86.47%;  /* 暖米色 */
  --secondary-foreground: 230 90% 7.84%;
  --muted: 31.11 39.13% 86.47%;
  --muted-foreground: 39.18 27.68% 34.71%;  /* 棕色正文 */
  --accent: 31.11 39.13% 86.47%;
  --accent-foreground: 230 90% 7.84%;
  --destructive: 4.77 87.13% 60.39%;  /* 珊瑚红 */
  --destructive-foreground: 60 100% 99.8%;
  --border: 30 20% 82%;
  --input: 30 20% 82%;
  --ring: 39.66 26.7% 43.33%;
  --radius: 0.75rem;                  /* 圆角 12px */
  --sidebar-*: 侧边栏专用颜色
  --chart-*: 图表颜色
}
```

### Tailwind 配置映射

`tailwind.config.js` 将 CSS 变量映射到工具类：

```js
colors: {
  primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  // ...
}
```

### 添加新主题

在 `src/index.css` 添加新主题类（如 `.warm`），并更新 `src/store/theme.ts` 的类型。

### 颜色格式

使用 HSL 格式：`色相 饱和度% 明度%`

| 主题 | 特点 |
|------|------|
| 默认 (暖色) | 色相 30-40，暖棕色调 |
| `.dark` | 明度值较低（3.9%） |
| `.warm` | 奶油背景 + 珊瑚红点缀 |

### 主题切换实现

| 文件 | 职责 |
|------|------|
| `src/store/theme.ts` | Zustand 状态管理，持久化到 localStorage |
| `src/components/providers/ThemeProvider.tsx` | 键盘快捷键 + 系统主题监听 |
| `src/components/layout/Header.tsx` | 主题切换下拉菜单 |

```typescript
type Theme = 'light' | 'dark' | 'warm' | 'system'

const applyTheme = (theme: 'light' | 'dark' | 'warm') => {
  document.documentElement.classList.remove('light', 'dark', 'warm')
  document.documentElement.classList.add(theme)
}
```

### 组件使用

```tsx
// 正确：使用语义化颜色
<div className="bg-primary text-primary-foreground" />
<div className="bg-background text-foreground" />
<div className="text-muted-foreground" />

// 错误：硬编码颜色
<div className="bg-blue-500" />
```

### 注意事项

- **始终使用语义化颜色变量**，不要硬编码颜色值
- 图表颜色需要在 `ChartContainer` 的 `config` 中单独配置
- `border-radius` 通过 `--radius` 变量统一管理（当前 12px）

## 添加 shadcn 组件
```bash
npx shadcn@latest add <component>
```

## 后端 API 响应格式
```json
{ "code": 200, "message": "success", "data": { } }
```

## 开发计划（6 阶段）
1. ✅ 基础搭建（Vite + Tailwind + shadcn + 路由）
2. ⬜ 认证模块（登录、Token 管理、路由守卫）
3. ⬜ 布局框架（侧边栏 + 顶栏 + 动态菜单）
4. ⬜ 系统管理页面（用户/角色/菜单/权限 CRUD）
5. ⬜ 日志与监控
6. ⬜ 业务功能（通知公告、个人中心）



## Git 提交规范

### 自动提交原则

- 每次完成一个独立的修改后，必须立即提交代码（不等用户要求）
- 每个 commit 只做一件事（原子化提交）
- 提交前确保测试通过（如有对应测试）

### Conventional Commits 规范

按修改类型使用对应前缀：

| 类型       | 说明               | 示例                                                |
| ---------- | ------------------ | --------------------------------------------------- |
| `feat`     | 新功能             | `feat: add industries endpoint`                     |
| `fix`      | Bug 修复           | `fix: correct field mapping in allocation response` |
| `refactor` | 重构（不改变行为） | `refactor: extract status computation to helper`    |
| `docs`     | 文档更新           | `docs: update API.md for new endpoints`             |
| `test`     | 测试相关           | `test: add tests for allocation results`            |
| `chore`    | 构建/依赖/配置     | `chore: update dependencies`                        |

### 类型隔离原则

- `fix` 不改变 API 接口
- `feat` 有明确边界，一个 commit 对应一个功能点
- `refactor` 不改变外部行为
- `docs` 独立于代码变更（如果代码和文档同时改，拆分为两个 commit）

### Commit Message 格式

```
<type>: <简短描述>
```

- 描述使用中文、不加句号
- 保持简洁（一行 50 字符以内为佳）



