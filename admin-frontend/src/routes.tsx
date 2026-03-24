import Dashboard from "@/pages/Dashboard"
import Hello from "@/pages/Hello"
import UserManagement from "@/pages/system/UserManagement"
import RoleManagement from "@/pages/system/RoleManagement"
import PermissionManagement from "@/pages/system/PermissionManagement"
import MenuManagement from "@/pages/system/MenuManagement"
import ApiLogPage from "@/pages/logs/ApiLogPage"
import LoginLogPage from "@/pages/logs/LoginLogPage"
import OperationLogPage from "@/pages/logs/OperationLogPage"
import ErrorLogPage from "@/pages/logs/ErrorLogPage"
import NoticeManagement from "@/pages/system/NoticeManagement"
import SystemMonitor from "@/pages/system/SystemMonitor"
import Profile from "@/pages/Profile"
import StorageManagement from "@/pages/system/StorageManagement"
import OnlineUsers from "@/pages/monitor/OnlineUsers"
import SystemSettings from "@/pages/system/SystemSettings"

export interface RouteConfig {
  path: string
  title: string
  icon: string
  element: React.ReactNode
}

/**
 * 所有受保护的页面路由（单一数据源）
 * 新增页面只需在此处添加一条，App.tsx 路由注册 + 开发者模式菜单自动生效
 */
export const appRoutes: RouteConfig[] = [
  { path: "/", title: "Dashboard", icon: "LayoutDashboard", element: <Dashboard /> },
  { path: "/hello", title: "Hello", icon: "Globe", element: <Hello /> },
  { path: "/system/user", title: "用户管理", icon: "Users", element: <UserManagement /> },
  { path: "/system/role", title: "角色管理", icon: "Shield", element: <RoleManagement /> },
  { path: "/system/menu", title: "菜单管理", icon: "Menu", element: <MenuManagement /> },
  { path: "/system/permission", title: "权限管理", icon: "Key", element: <PermissionManagement /> },
  { path: "/logs/api", title: "API日志", icon: "FileText", element: <ApiLogPage /> },
  { path: "/logs/login", title: "登录日志", icon: "LogIn", element: <LoginLogPage /> },
  { path: "/logs/operation", title: "操作日志", icon: "FileText", element: <OperationLogPage /> },
  { path: "/logs/error", title: "异常日志", icon: "AlertCircle", element: <ErrorLogPage /> },
  { path: "/system/notice", title: "通知公告", icon: "Bell", element: <NoticeManagement /> },
  { path: "/system/monitor", title: "系统监控", icon: "Activity", element: <SystemMonitor /> },
  { path: "/system/storage", title: "存储管理", icon: "HardDrive", element: <StorageManagement /> },
  { path: "/monitor/online", title: "在线用户", icon: "Monitor", element: <OnlineUsers /> },
  { path: "/system/settings", title: "系统设置", icon: "Settings", element: <SystemSettings /> },
  { path: "/profile", title: "个人中心", icon: "User", element: <Profile /> },
]
