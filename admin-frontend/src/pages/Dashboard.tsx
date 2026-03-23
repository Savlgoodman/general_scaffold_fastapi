import { useState, useEffect } from "react"
import {
  Users,
  Shield,
  LogIn,
  AlertCircle,
  Activity,
  Server,
  HardDrive,
  Wifi,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Megaphone,
  Pin,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getNotices } from "@/api/generated/notices/notices"
import type { AdminNotice } from "@/api/generated/model"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  Area,
  AreaChart,
} from "recharts"

// 访问趋势数据
const visitTrendData = [
  { hour: "00", visits: 120, users: 45 },
  { hour: "04", visits: 80, users: 30 },
  { hour: "08", visits: 450, users: 180 },
  { hour: "12", visits: 680, users: 320 },
  { hour: "16", visits: 520, users: 240 },
  { hour: "20", visits: 380, users: 150 },
  { hour: "23", visits: 200, users: 85 },
]

// 用户活跃度数据
const userActivityData = [
  { name: "周一", active: 890, new: 45 },
  { name: "周二", active: 1200, new: 62 },
  { name: "周三", active: 1100, new: 58 },
  { name: "周四", active: 1350, new: 71 },
  { name: "周五", active: 980, new: 48 },
  { name: "周六", active: 650, new: 35 },
  { name: "周日", active: 520, new: 28 },
]

// 系统负载分布
const systemLoadData = [
  { name: "API", value: 35, color: "#3b82f6" },
  { name: "DB", value: 45, color: "#22c55e" },
  { name: "Cache", value: 15, color: "#f59e0b" },
  { name: "Other", value: 5, color: "#6b7280" },
]

const stats = [
  {
    title: "总用户数",
    value: "1,234",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    description: "较上月增长",
  },
  {
    title: "在线用户",
    value: "56",
    change: "-3.2%",
    trend: "down",
    icon: Activity,
    description: "当前在线",
  },
  {
    title: "系统角色",
    value: "12",
    change: "+2",
    trend: "up",
    icon: Shield,
    description: "角色数量",
  },
  {
    title: "今日登录",
    value: "89",
    change: "+23.1%",
    trend: "up",
    icon: LogIn,
    description: "今日访问",
  },
]

const recentActivities = [
  { user: "张三", action: "登录系统", time: "2分钟前", avatar: "ZS" },
  { user: "李四", action: "更新了用户权限", time: "15分钟前", avatar: "LS" },
  { user: "王五", action: "修改了菜单配置", time: "1小时前", avatar: "WW" },
  { user: "赵六", action: "导出系统日志", time: "2小时前", avatar: "ZL" },
]

const quickActions = [
  { title: "用户管理", description: "管理系统用户" },
  { title: "角色配置", description: "配置角色权限" },
  { title: "系统设置", description: "系统参数配置" },
  { title: "日志查看", description: "查看操作日志" },
]

const systemStatus = [
  { name: "API服务", status: "正常运行", variant: "default" as const, icon: Server },
  { name: "数据库", status: "正常运行", variant: "default" as const, icon: HardDrive },
  { name: "缓存服务", status: "正常运行", variant: "default" as const, icon: Wifi },
  { name: "任务调度", status: "正常运行", variant: "default" as const, icon: Clock },
]

const noticesApi = getNotices()

function NoticeBoard() {
  const [notices, setNotices] = useState<AdminNotice[]>([])
  const [detail, setDetail] = useState<AdminNotice | null>(null)

  useEffect(() => {
    noticesApi.listNotices({ pageNum: 1, pageSize: 8, status: 'published', type: 'announcement' })
      .then(res => {
        if (res.code === 200 && res.data?.records) setNotices(res.data.records)
      })
      .catch(() => {})
  }, [])

  if (notices.length === 0) return null

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <CardTitle className="text-lg">公告通知</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {notices.map(n => (
              <div
                key={n.id}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setDetail(n)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {n.isTop === 1 && <Pin className="w-3 h-3 text-red-500 shrink-0" />}
                  <span className="text-sm truncate">{n.title}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{n.type === 'announcement' ? '公告' : '通知'}</Badge>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-3">
                  {n.publishTime?.substring(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detail?.isTop === 1 && <Pin className="w-4 h-4 text-red-500" />}
              {detail?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline">{detail?.type === 'announcement' ? '公告' : '通知'}</Badge>
              <span>{detail?.publishTime?.replace('T', ' ').substring(0, 19)}</span>
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{detail?.content}</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground">欢迎回来！以下是系统概览。</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1 text-xs">
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="size-3 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="size-3 text-red-500" />
                    )}
                    <span
                      className={
                        stat.trend === "up" ? "text-emerald-500" : "text-red-500"
                      }
                    >
                      {stat.change}
                    </span>
                    <span className="text-muted-foreground">
                      {stat.description}
                    </span>
                  </div>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <stat.icon className="size-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notice Board - 公告(announcement)展示 */}
      <NoticeBoard />

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visit Trend - Large Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">访问趋势</CardTitle>
                <CardDescription>24小时访问量与用户数</CardDescription>
              </div>
              <Badge variant="secondary">实时</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ChartContainer
              config={{
                visits: { label: "访问量", color: "hsl(217 91% 60%)" },
                users: { label: "用户数", color: "hsl(142 76% 36%)" },
              }}
              className="h-[320px] w-full"
            >
              <AreaChart data={visitTrendData}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}:00`}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="var(--color-visits)"
                  strokeWidth={2}
                  fill="url(#colorVisits)"
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="var(--color-users)"
                  strokeWidth={2}
                  fill="url(#colorUsers)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* System Load Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">系统负载</CardTitle>
            <CardDescription>资源分布</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ChartContainer
              config={systemLoadData.reduce((acc, item) => {
                acc[item.name] = { label: item.name }
                return acc
              }, {} as Record<string, { label: string }>)}
              className="h-[200px] w-full"
            >
              <PieChart>
                <Pie
                  data={systemLoadData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {systemLoadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {systemLoadData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="size-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                  <span className="text-sm font-medium ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Activity Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">用户活跃度</CardTitle>
              <CardDescription>本周用户活跃与新增趋势</CardDescription>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">活跃</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">新增</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <ChartContainer
            config={{
              active: { label: "活跃用户", color: "hsl(217 91% 60%)" },
              new: { label: "新增用户", color: "hsl(142 76% 36%)" },
            }}
            className="h-[280px] w-full"
          >
            <BarChart data={userActivityData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="active"
                fill="var(--color-active)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="new"
                fill="var(--color-new)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">最近活动</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-muted text-xs">
                      {activity.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.action}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center p-4 rounded-lg border bg-accent/50 hover:bg-accent cursor-pointer transition-colors"
                >
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground text-center">
                    {action.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">系统状态</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-3">
              {systemStatus.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/10 p-2">
                      <item.icon className="size-4 text-emerald-500" />
                    </div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500">
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="size-3" />
              <span>最后检查: 1分钟前</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
