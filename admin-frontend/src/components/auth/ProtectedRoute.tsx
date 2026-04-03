import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import type { MenuVO } from '@/api/generated/model'
import Forbidden from '@/pages/Forbidden'

/** 从菜单树中提取所有 path（扁平化） */
function extractPaths(menus: MenuVO[]): Set<string> {
  const paths = new Set<string>()
  function walk(items: MenuVO[]) {
    for (const item of items) {
      if (item.path) paths.add(item.path)
      if (item.children?.length) walk(item.children)
    }
  }
  walk(menus)
  return paths
}

export default function ProtectedRoute() {
  const { isAuthenticated, user, menus, devMode } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 超管 + 开发者模式：允许所有路由
  const isSuperuser = user?.isSuperuser === 1
  if (isSuperuser && devMode) {
    return <Outlet />
  }

  // 白名单路由：所有登录用户均可访问
  const publicPaths = ['/', '/profile']
  if (publicPaths.includes(location.pathname)) {
    return <Outlet />
  }

  // 检查当前路由是否在用户菜单中
  const allowedPaths = extractPaths(menus)
  if (allowedPaths.has(location.pathname)) {
    return <Outlet />
  }

  return <Forbidden />
}
