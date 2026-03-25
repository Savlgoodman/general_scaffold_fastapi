import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sun, Moon, Coffee, Monitor, Bell } from 'lucide-react'
import { useThemeStore } from '@/store/theme'
import { usePreferencesStore } from '@/store/preferences'

export default function Settings() {
  const { theme, setTheme } = useThemeStore()
  const {
    showHeaderNotice, setShowHeaderNotice,
    noticeSpeed, setNoticeSpeed,
    sidebarCollapsed, setSidebarCollapsed,
  } = usePreferencesStore()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">偏好设置</h1>
        <p className="text-muted-foreground mt-1">自定义你的界面和交互偏好，仅对当前浏览器生效</p>
      </div>

      {/* 外观设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Sun className="w-4 h-4" />外观</CardTitle>
          <CardDescription>自定义界面主题和布局</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">主题</Label>
              <p className="text-xs text-muted-foreground mt-0.5">选择界面配色方案</p>
            </div>
            <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light"><span className="flex items-center gap-2"><Sun className="w-3.5 h-3.5" />浅色</span></SelectItem>
                <SelectItem value="dark"><span className="flex items-center gap-2"><Moon className="w-3.5 h-3.5" />深色</span></SelectItem>
                <SelectItem value="warm"><span className="flex items-center gap-2"><Coffee className="w-3.5 h-3.5" />暖色</span></SelectItem>
                <SelectItem value="system"><span className="flex items-center gap-2"><Monitor className="w-3.5 h-3.5" />跟随系统</span></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">侧边栏默认折叠</Label>
              <p className="text-xs text-muted-foreground mt-0.5">页面加载时侧边栏是否自动折叠</p>
            </div>
            <Switch checked={sidebarCollapsed} onCheckedChange={setSidebarCollapsed} />
          </div>
        </CardContent>
      </Card>

      {/* 通知设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Bell className="w-4 h-4" />通知</CardTitle>
          <CardDescription>管理通知的显示方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Header 通知轮播</Label>
              <p className="text-xs text-muted-foreground mt-0.5">在顶部导航栏显示滚动通知</p>
            </div>
            <Switch checked={showHeaderNotice} onCheckedChange={setShowHeaderNotice} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">轮播速度</Label>
              <p className="text-xs text-muted-foreground mt-0.5">通知切换的时间间隔</p>
            </div>
            <Select value={noticeSpeed} onValueChange={(v: any) => setNoticeSpeed(v)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">慢速 (8s)</SelectItem>
                <SelectItem value="normal">正常 (5s)</SelectItem>
                <SelectItem value="fast">快速 (3s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">所有设置自动保存到浏览器本地存储</p>
    </div>
  )
}
