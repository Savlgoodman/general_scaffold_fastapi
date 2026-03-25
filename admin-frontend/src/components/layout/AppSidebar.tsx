import { Link, useLocation, useNavigate } from "react-router-dom"
import { useState } from "react"
import { LayoutDashboard, Settings, LogOut, ChevronRight, ChevronDown } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { useSiteConfigStore } from "@/store/site-config"
import { usePreferencesStore } from "@/store/preferences"
import { appRoutes } from "@/routes"
import { getIcon } from "@/lib/icon-map"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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

function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const { menus, user, devMode, logout } = useAuthStore()
  const { config } = useSiteConfigStore()
  const { sidebarStyle, avatarPosition } = usePreferencesStore()
  const isSuperuser = user?.isSuperuser === 1
  const showDevMode = isSuperuser && devMode
  const displayName = user?.nickname || user?.username || 'Admin'

  const flatMenuItems = menus.flatMap((item) =>
    item.type === "directory" && item.children?.length ? item.children : [item]
  )

  const handleLogout = () => { logout(); window.location.href = '/login' }

  // ==================== 菜单渲染 ====================

  const renderDevMode = () => (
    <SidebarGroup>
      <SidebarGroupLabel><Settings className="size-4" data-icon="inline-start" />全部页面</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {appRoutes.map((route) => {
            const Icon = getIcon(route.icon)
            return (
              <SidebarMenuItem key={route.path}>
                <SidebarMenuButton asChild isActive={location.pathname === route.path} tooltip={route.title}>
                  <Link to={route.path}><Icon className="size-4" data-icon="inline-start" />{route.title}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )

  const renderCollapsed = () => (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {flatMenuItems.map((item) => {
            const Icon = getIcon(item.icon)
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.name}>
                  <Link to={item.path ?? "/"}><Icon className="size-4" data-icon="inline-start" />{item.name}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )

  // 默认分组样式：GroupLabel + Sub 缩进
  const renderDefault = () => menus.map((item) => {
    if (item.type === "directory" && item.children?.length) {
      const DirIcon = getIcon(item.icon)
      return (
        <SidebarGroup key={item.id}>
          <SidebarGroupLabel><DirIcon className="size-4" data-icon="inline-start" />{item.name}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuSub>
                {item.children.map((child) => {
                  const ChildIcon = getIcon(child.icon)
                  return (
                    <SidebarMenuSubItem key={child.id}>
                      <SidebarMenuSubButton asChild isActive={location.pathname === child.path}>
                        <Link to={child.path ?? "/"}><ChildIcon className="size-4" data-icon="inline-start" />{child.name}</Link>
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
              <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.name}>
                <Link to={item.path ?? "/"}><ItemIcon className="size-4" data-icon="inline-start" />{item.name}</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  })

  // 紧凑列表样式：分组标签 + 无缩进的平级列表
  const renderCompact = () => menus.map((item) => {
    if (item.type === "directory" && item.children?.length) {
      const DirIcon = getIcon(item.icon)
      return (
        <SidebarGroup key={item.id}>
          <SidebarGroupLabel><DirIcon className="size-4" data-icon="inline-start" />{item.name}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {item.children.map((child) => {
                const ChildIcon = getIcon(child.icon)
                return (
                  <SidebarMenuItem key={child.id}>
                    <SidebarMenuButton asChild isActive={location.pathname === child.path} tooltip={child.name}>
                      <Link to={child.path ?? "/"}><ChildIcon className="size-4" data-icon="inline-start" />{child.name}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
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
              <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.name}>
                <Link to={item.path ?? "/"}><ItemIcon className="size-4" data-icon="inline-start" />{item.name}</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  })

  // 扁平无组样式：所有菜单扁平排列
  const renderFlat = () => (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {flatMenuItems.map((item) => {
            const Icon = getIcon(item.icon)
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.name}>
                  <Link to={item.path ?? "/"}><Icon className="size-4" data-icon="inline-start" />{item.name}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )

  // 可折叠分组样式：目录可点击展开/折叠
  const renderCollapsible = () => menus.map((item) => {
    if (item.type === "directory" && item.children?.length) {
      const DirIcon = getIcon(item.icon)
      // 如果任一子菜单 path 与当前路由匹配，默认展开
      const hasActiveChild = item.children.some(c => location.pathname === c.path)
      return (
        <CollapsibleGroup key={item.id} icon={DirIcon} label={item.name ?? ''} defaultOpen={hasActiveChild}>
          <SidebarMenuSub>
            {item.children.map((child) => {
              const ChildIcon = getIcon(child.icon)
              return (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton asChild isActive={location.pathname === child.path}>
                    <Link to={child.path ?? "/"}><ChildIcon className="size-4" data-icon="inline-start" />{child.name}</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleGroup>
      )
    }
    const ItemIcon = getIcon(item.icon)
    return (
      <SidebarGroup key={item.id}>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === item.path} tooltip={item.name}>
                <Link to={item.path ?? "/"}><ItemIcon className="size-4" data-icon="inline-start" />{item.name}</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  })

  const renderExpandedMenus = () => {
    if (showDevMode) return renderDevMode()
    if (sidebarStyle === 'compact') return renderCompact()
    if (sidebarStyle === 'collapsible') return renderCollapsible()
    if (sidebarStyle === 'flat') return renderFlat()
    return renderDefault()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="!p-0 px-2 h-16 shrink-0 justify-center border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
                  {config.site_logo ? (
                    <img src={config.site_logo} alt={config.site_name} className="size-5 object-contain" />
                  ) : (
                    <LayoutDashboard className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{config.site_name || 'Admin'}</span>
                  <span className="truncate text-xs">{config.site_subtitle || '管理系统'}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {collapsed ? renderCollapsed() : renderExpandedMenus()}
      </SidebarContent>

      {/* 侧边栏底部用户头像 */}
      {avatarPosition === 'sidebar' && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={displayName}>
                    <Avatar className="size-8">
                      <AvatarImage src={user?.avatar || ''} alt={displayName} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">{user?.username}</span>
                    </div>
                    <ChevronRight className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.username}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>个人中心</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}

// 可折叠分组子组件
function CollapsibleGroup({ icon: Icon, label, defaultOpen = false, children }: {
  icon: React.ComponentType<{ className?: string; 'data-icon'?: string }>
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors">
            <Icon className="size-4" data-icon="inline-start" />
            {label}
            <ChevronDown className={`ml-auto size-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            {children}
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

export default AppSidebar
