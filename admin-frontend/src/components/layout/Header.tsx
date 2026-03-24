import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, Search, Sun, Moon, Monitor, Coffee, LogOut, Code, Megaphone } from "lucide-react"
import { useThemeStore } from "@/store/theme"
import { useAuthStore } from "@/store/auth"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { getNotices } from "@/api/generated/notices/notices"
import type { AdminNotice } from "@/api/generated/model"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const noticesApi = getNotices()

function NoticeMarquee() {
  const [notices, setNotices] = useState<AdminNotice[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    noticesApi.listNotices({ pageNum: 1, pageSize: 10, status: 'published', type: 'notice' })
      .then(res => {
        if (res.code === 200 && res.data?.records) {
          setNotices(res.data.records)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (notices.length <= 1) return
    const current = notices[currentIndex]
    const delay = current?.isTop === 1 ? 10000 : 5000
    const timer = setTimeout(() => {
      setCurrentIndex(i => (i + 1) % notices.length)
    }, delay)
    return () => clearTimeout(timer)
  }, [notices, currentIndex])

  if (notices.length === 0) return null

  const current = notices[currentIndex]
  const isTop = current?.isTop === 1

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-md max-w-sm ${isTop ? 'bg-red-500/10' : 'bg-primary/5'}`}>
      <Megaphone className={`w-3.5 h-3.5 shrink-0 ${isTop ? 'text-red-500' : 'text-primary'}`} />
      <div className="overflow-hidden h-5 flex-1">
        <div
          key={currentIndex}
          className={`text-xs truncate leading-5 ${isTop ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}
          style={{ animation: 'notice-slide-in 0.4s ease-out' }}
        >
          {current?.title}
        </div>
      </div>
      <style>{`
        @keyframes notice-slide-in {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function Header() {
  const navigate = useNavigate()
  const { theme, setTheme } = useThemeStore()
  const { logout, user, devMode, toggleDevMode } = useAuthStore()
  const isSuperuser = user?.isSuperuser === 1

  const themeIcon = {
    light: Sun,
    dark: Moon,
    warm: Coffee,
    system: Monitor,
  }[theme]

  const ThemeIcon = themeIcon

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  // 获取用户显示名
  const displayName = user?.username || user?.nickname || 'Admin'

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索..."
            className="pl-8 w-full"
          />
        </div>
        <NoticeMarquee />
      </div>
      <div className="flex items-center">
        <div className="flex items-center gap-1">
          {/* Dev Mode Toggle (superuser only) */}
          {isSuperuser && (
            <div className="flex items-center gap-2 mr-2">
              <div className="flex items-center gap-1.5">
                <Code className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground hidden sm:inline">开发者模式</span>
              </div>
              <Switch
                checked={devMode}
                onCheckedChange={toggleDevMode}
                aria-label="开发者模式"
              />
              {devMode && (
                <span><Badge variant="secondary" className="text-[10px] px-1.5 py-0">DEV</Badge></span>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <ThemeIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center gap-2">
                <Sun className="size-4" />
                浅色
                {theme === "light" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("warm")} className="flex items-center gap-2">
                <Coffee className="size-4" />
                暖色
                {theme === "warm" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center gap-2">
                <Moon className="size-4" />
                深色
                {theme === "dark" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center gap-2">
                <Monitor className="size-4" />
                跟随系统
                {theme === "system" && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="size-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="size-8">
                <AvatarImage src={user?.avatar || ''} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.username}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>个人中心</DropdownMenuItem>
            <DropdownMenuItem>设置</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default Header
