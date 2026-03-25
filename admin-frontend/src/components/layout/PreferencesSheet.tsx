import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Sun, Moon, Coffee, Monitor } from 'lucide-react'
import { useThemeStore } from '@/store/theme'
import { usePreferencesStore, type SidebarStyle, type AvatarPosition } from '@/store/preferences'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PreferencesSheet({ open, onOpenChange }: Props) {
  const { theme, setTheme } = useThemeStore()
  const {
    showHeaderNotice, setShowHeaderNotice,
    noticeSpeed, setNoticeSpeed,
    sidebarStyle, setSidebarStyle,
    avatarPosition, setAvatarPosition,
  } = usePreferencesStore()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>偏好设置</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* 外观 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">外观</h3>

            <div className="flex items-center justify-between">
              <Label className="text-sm">主题</Label>
              <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light"><span className="flex items-center gap-2"><Sun className="w-3 h-3" />浅色</span></SelectItem>
                  <SelectItem value="dark"><span className="flex items-center gap-2"><Moon className="w-3 h-3" />深色</span></SelectItem>
                  <SelectItem value="warm"><span className="flex items-center gap-2"><Coffee className="w-3 h-3" />暖色</span></SelectItem>
                  <SelectItem value="system"><span className="flex items-center gap-2"><Monitor className="w-3 h-3" />跟随系统</span></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">侧边栏样式</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">切换菜单栏的展示风格</p>
              </div>
              <Select value={sidebarStyle} onValueChange={(v) => setSidebarStyle(v as SidebarStyle)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">默认分组</SelectItem>
                  <SelectItem value="compact">紧凑列表</SelectItem>
                  <SelectItem value="collapsible">可折叠分组</SelectItem>
                  <SelectItem value="flat">扁平无组</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">头像位置</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">选择用户头像的展示位置</p>
              </div>
              <Select value={avatarPosition} onValueChange={(v) => setAvatarPosition(v as AvatarPosition)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">右上角</SelectItem>
                  <SelectItem value="sidebar">侧边栏底部</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* 通知 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">通知</h3>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Header 通知轮播</Label>
              <Switch checked={showHeaderNotice} onCheckedChange={setShowHeaderNotice} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">轮播速度</Label>
              <Select value={noticeSpeed} onValueChange={(v: any) => setNoticeSpeed(v)}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">慢速 (8s)</SelectItem>
                  <SelectItem value="normal">正常 (5s)</SelectItem>
                  <SelectItem value="fast">快速 (3s)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground text-center mt-8">所有设置自动保存到浏览器</p>
      </SheetContent>
    </Sheet>
  )
}
