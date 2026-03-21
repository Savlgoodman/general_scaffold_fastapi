import { Bell, Search, Sun, Moon, Monitor, Coffee, LogOut } from "lucide-react"
import { useThemeStore } from "@/store/theme"
import { useAuthStore } from "@/store/auth"
import { Input } from "@/components/ui/input"
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

function Header() {
  const { theme, setTheme } = useThemeStore()
  const { logout, user } = useAuthStore()

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
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索..."
            className="pl-8 w-full max-w-xs"
          />
        </div>
      </div>
      <div className="flex items-center">
        <div className="flex items-center gap-1">
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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
              3
            </span>
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="size-8">
                <AvatarImage src="" alt={displayName} />
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
            <DropdownMenuItem>个人中心</DropdownMenuItem>
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
