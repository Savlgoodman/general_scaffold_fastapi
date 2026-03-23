import { Link, useLocation } from "react-router-dom"
import { type LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Users,
  Shield,
  Menu,
  Key,
  FileText,
  LogIn,
  AlertCircle,
  Settings,
  Globe,
  Home,
  Database,
  Bell,
  BookOpen,
  Folder,
} from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { appRoutes } from "@/routes"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

// icon 字符串 → lucide-react 组件映射
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Shield,
  Menu,
  Key,
  FileText,
  LogIn,
  AlertCircle,
  Settings,
  Globe,
  Home,
  Database,
  Bell,
  BookOpen,
  Folder,
}

function getIcon(iconName?: string): LucideIcon {
  if (!iconName) return Folder
  return iconMap[iconName] ?? Folder
}

function AppSidebar() {
  const location = useLocation()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const { menus, user, devMode } = useAuthStore()
  const isSuperuser = user?.isSuperuser === 1
  const showDevMode = isSuperuser && devMode

  // 从菜单树中提取所有叶子菜单（扁���化），收起时使用
  const flatMenuItems = menus.flatMap((item) =>
    item.type === "directory" && item.children?.length
      ? item.children
      : [item]
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="!p-0 px-2 h-16 shrink-0 justify-center border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Admin</span>
                  <span className="truncate text-xs">管理系统</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {showDevMode ? (
          /* 开发者模式 */
          <SidebarGroup>
            <SidebarGroupLabel>
              <Settings className="size-4" data-icon="inline-start" />
              全部页面
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {appRoutes.map((route) => {
                  const Icon = getIcon(route.icon)
                  return (
                    <SidebarMenuItem key={route.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === route.path}
                        tooltip={route.title}
                      >
                        <Link to={route.path}>
                          <Icon className="size-4" data-icon="inline-start" />
                          {route.title}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : collapsed ? (
          /* 收起模式：所有菜单扁平显示为图标 */
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {flatMenuItems.map((item) => {
                  const Icon = getIcon(item.icon)
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.path}
                        tooltip={item.name}
                      >
                        <Link to={item.path ?? "/"}>
                          <Icon className="size-4" data-icon="inline-start" />
                          {item.name}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          /* 展开模式：原来的 GroupLabel + Sub 样式 */
          menus.map((item) => {
            if (item.type === "directory" && item.children?.length) {
              const DirIcon = getIcon(item.icon)
              return (
                <SidebarGroup key={item.id}>
                  <SidebarGroupLabel>
                    <DirIcon className="size-4" data-icon="inline-start" />
                    {item.name}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuSub>
                        {item.children.map((child) => {
                          const ChildIcon = getIcon(child.icon)
                          return (
                            <SidebarMenuSubItem key={child.id}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={location.pathname === child.path}
                              >
                                <Link to={child.path ?? "/"}>
                                  <ChildIcon
                                    className="size-4"
                                    data-icon="inline-start"
                                  />
                                  {child.name}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )
            }

            const ItemIcon = getIcon(item.icon)
            return (
              <SidebarGroup key={item.id}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.path}
                        tooltip={item.name}
                      >
                        <Link to={item.path ?? "/"}>
                          <ItemIcon className="size-4" data-icon="inline-start" />
                          {item.name}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })
        )}
      </SidebarContent>
    </Sidebar>
  )
}

export default AppSidebar
