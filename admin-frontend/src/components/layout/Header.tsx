import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, Search, Sun, Moon, Monitor, Coffee, LogOut, Code, Megaphone, Eraser, Settings } from "lucide-react"
import { useThemeStore } from "@/store/theme"
import { useAuthStore } from "@/store/auth"
import { usePreferencesStore, NOTICE_SPEED_MAP } from "@/store/preferences"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import PreferencesSheet from "./PreferencesSheet"
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
  const { showHeaderNotice, noticeSpeed } = usePreferencesStore()

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
    const baseDelay = NOTICE_SPEED_MAP[noticeSpeed]
    const delay = current?.isTop === 1 ? baseDelay * 2 : baseDelay
    const timer = setTimeout(() => {
      setCurrentIndex(i => (i + 1) % notices.length)
    }, delay)
    return () => clearTimeout(timer)
  }, [notices, currentIndex, noticeSpeed])

  if (!showHeaderNotice) return null

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

function NotificationBell() {
  const [notices, setNotices] = useState<AdminNotice[]>([])
  const [detail, setDetail] = useState<AdminNotice | null>(null)
  const { readNoticeIds, markNoticeRead, markAllNoticesRead } = usePreferencesStore()

  useEffect(() => {
    noticesApi.listNotices({ pageNum: 1, pageSize: 20, status: 'published' })
      .then(res => {
        if (res.code === 200 && res.data?.records) setNotices(res.data.records)
      })
      .catch(() => {})
  }, [])

  const unreadCount = notices.filter(n => n.id && !readNoticeIds.includes(n.id)).length

  // 排序：未读优先，同组内按时间倒序
  const sorted = [...notices].sort((a, b) => {
    const aRead = a.id ? readNoticeIds.includes(a.id) : true
    const bRead = b.id ? readNoticeIds.includes(b.id) : true
    if (aRead !== bRead) return aRead ? 1 : -1
    return (b.publishTime ?? '').localeCompare(a.publishTime ?? '')
  })

  const handleClick = (n: AdminNotice) => {
    if (n.type === 'announcement') {
      // 公告：弹出详情弹窗，标记已读
      setDetail(n)
      if (n.id) markNoticeRead(n.id)
    } else {
      // 通知：直接标记已读
      if (n.id) markNoticeRead(n.id)
    }
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-medium">通知 ({unreadCount} 未读)</span>
            {unreadCount > 0 && (
              <Button variant="ghost" size="icon" className="size-7" title="全部已读" onClick={() => markAllNoticesRead(notices.map(n => n.id!).filter(Boolean))}>
                <Eraser className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notices.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">暂无通知</div>
            ) : sorted.map(n => {
              const isRead = n.id ? readNoticeIds.includes(n.id) : true
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors ${isRead ? 'opacity-50' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <div className={`mt-1.5 size-2 rounded-full shrink-0 ${isRead ? 'bg-transparent' : 'bg-primary'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.publishTime?.substring(0, 10)}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{n.type === 'notice' ? '通知' : '公告'}</Badge>
                </div>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* 公告详情弹窗 */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline">公告</Badge>
              <span>{detail?.publishTime?.replace('T', ' ').substring(0, 19)}</span>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail?.content ?? ''}</ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Header() {
  const navigate = useNavigate()
  const { theme, setTheme } = useThemeStore()
  const { logout, user, devMode, toggleDevMode } = useAuthStore()
  const { avatarPosition } = usePreferencesStore()
  const [prefsOpen, setPrefsOpen] = useState(false)
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
  const displayName = user?.nickname || user?.username || 'Admin'

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
          <NotificationBell />
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        {avatarPosition === 'header' ? (
          /* User Menu - 头像在右上角 */
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
              <DropdownMenuItem onClick={() => setPrefsOpen(true)}>设置</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          /* 头像在侧边栏时，右上角只显示设置按钮 */
          <Button variant="ghost" size="icon" onClick={() => setPrefsOpen(true)}>
            <Settings className="size-4" />
          </Button>
        )}
      </div>

      <PreferencesSheet open={prefsOpen} onOpenChange={setPrefsOpen} />
    </header>
  )
}

export default Header
