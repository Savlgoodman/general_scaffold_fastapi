import { useState, useEffect, useCallback } from "react"
import {
  Users,
  LogIn,
  AlertCircle,
  Activity,
  Megaphone,
  Pin,
  Zap,
  Clock,
  TrendingUp,
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
import { Skeleton } from "@/components/ui/skeleton"
import { getNotices } from "@/api/javaedition/notices/notices"
import { getStatistics } from "@/api/javaedition/statistics/statistics"
import type {
  AdminNotice,
  StatOverviewVO,
  StatLoginTrendVO,
  StatApiStatsVO,
  StatRecentLoginVO,
  StatErrorTrendVO,
} from "@/api/javaedition/model"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useAuthStore } from "@/store/auth"
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
  Area,
  AreaChart,
} from "recharts"

const noticesApi = getNotices()
const statsApi = getStatistics()

// ─── 通用 hook：请求数据，403 时隐藏 section ───

function useStatData<T>(fetcher: () => Promise<{ code?: number; data?: T }>) {
  const [data, setData] = useState<T | null>(null)
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    fetcher()
      .then(res => {
        if (res.code === 200 && res.data) setData(res.data)
        else setVisible(false)
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 403) setVisible(false)
      })
      .finally(() => setLoading(false))
  }, [fetcher])

  useEffect(() => { refresh() }, [refresh])

  return { data, visible, loading, refresh }
}

// ─── 概览卡片 ───

const overviewCards = [
  { key: "totalUsers" as const, title: "用户总数", icon: Users, sub: (d: StatOverviewVO) => `${d.activeUsers ?? 0} 活跃` },
  { key: "onlineUsers" as const, title: "在线用户", icon: Activity, sub: () => "当前在线" },
  { key: "todayLoginSuccess" as const, title: "今日登录", icon: LogIn, sub: (d: StatOverviewVO) => `${d.todayLoginFailed ?? 0} 次失败` },
  { key: "todayErrors" as const, title: "今日错误", icon: AlertCircle, sub: () => "异常数量" },
]

function OverviewCards() {
  const { data, visible, loading } = useStatData(
    useCallback(() => statsApi.getStatOverview(), [])
  )
  if (!visible) return null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="size-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        : overviewCards.map(card => {
            const value = data?.[card.key] ?? 0
            return (
              <Card key={card.key}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{data ? card.sub(data) : ""}</p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-3">
                      <card.icon className="size-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
    </div>
  )
}

// ─── 公告通知 ───

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
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail?.content ?? ''}</ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── 登录趋势 ───

function LoginTrendChart() {
  const { data, visible, loading } = useStatData<StatLoginTrendVO[]>(
    useCallback(() => statsApi.getStatLoginTrend(), [])
  )
  if (!visible) return null

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">登录趋势</CardTitle>
            <CardDescription>最近 7 天登录成功与失败次数</CardDescription>
          </div>
          <TrendingUp className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {loading ? (
          <Skeleton className="h-[280px] w-full rounded" />
        ) : (
          <ChartContainer
            config={{
              successCount: { label: "成功", color: "hsl(var(--chart-1))" },
              failedCount: { label: "失败", color: "hsl(var(--chart-2))" },
            }}
            className="h-[280px] w-full"
          >
            <AreaChart data={data ?? []}>
              <defs>
                <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-successCount)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-successCount)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-failedCount)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-failedCount)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="successCount" stroke="var(--color-successCount)" strokeWidth={2} fill="url(#gradSuccess)" />
              <Area type="monotone" dataKey="failedCount" stroke="var(--color-failedCount)" strokeWidth={2} fill="url(#gradFailed)" />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── API 统计 ───

function ApiStatsCard() {
  const { data, visible, loading } = useStatData<StatApiStatsVO>(
    useCallback(() => statsApi.getStatApiStats(), [])
  )
  if (!visible) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">API 统计</CardTitle>
          <Zap className="size-4 text-muted-foreground" />
        </div>
        <CardDescription>今日请求概况</CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-12" /></div>
            ))}
            <Skeleton className="h-4 w-24 mt-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`s${i}`} className="flex justify-between"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-10" /></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">请求总数</span>
                <span className="text-sm font-semibold">{(data?.todayRequests ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">平均响应</span>
                <span className="text-sm font-semibold">{(data?.avgResponseTime ?? 0).toFixed(0)} ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">错误率</span>
                <span className={`text-sm font-semibold ${(data?.errorRate ?? 0) > 5 ? 'text-destructive' : ''}`}>
                  {(data?.errorRate ?? 0).toFixed(2)}%
                </span>
              </div>
            </div>

            {(data?.slowEndpoints?.length ?? 0) > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">慢接口 Top 5</p>
                <div className="space-y-2">
                  {data!.slowEndpoints!.map((ep, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Badge variant="outline" className="text-[10px] shrink-0 font-mono px-1">
                          {ep.method}
                        </Badge>
                        <span className="truncate text-muted-foreground">{ep.path}</span>
                      </div>
                      <span className="shrink-0 ml-2 font-medium">{(ep.avgDuration ?? 0).toFixed(0)} ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── 错误趋势 ───

function ErrorTrendChart() {
  const { data, visible, loading } = useStatData<StatErrorTrendVO[]>(
    useCallback(() => statsApi.getStatErrorTrend(), [])
  )
  if (!visible) return null

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">错误趋势</CardTitle>
            <CardDescription>最近 7 天系统异常数量</CardDescription>
          </div>
          <AlertCircle className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {loading ? (
          <Skeleton className="h-[280px] w-full rounded" />
        ) : (
          <ChartContainer
            config={{
              count: { label: "错误数", color: "hsl(var(--chart-2))" },
            }}
            className="h-[280px] w-full"
          >
            <BarChart data={data ?? []} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── 最近登录 ───

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return ""
  const now = Date.now()
  const time = new Date(dateStr).getTime()
  const diff = Math.floor((now - time) / 1000)
  if (diff < 60) return "刚刚"
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}

function RecentLoginsCard() {
  const { data, visible, loading } = useStatData<StatRecentLoginVO[]>(
    useCallback(() => statsApi.getStatRecentLogins({ limit: 10 }), [])
  )
  if (!visible) return null

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">最近登录</CardTitle>
          <Clock className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 flex-1 min-h-0">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {(data ?? []).map((login, i) => (
              <div key={i} className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-muted text-xs">
                    {(login.username ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{login.username}</p>
                    <p className="text-xs text-muted-foreground">{login.ip}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge
                      variant={login.status === "success" ? "default" : "destructive"}
                      className="text-[10px]"
                    >
                      {login.status === "success" ? "成功" : "失败"}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(login.createTime as unknown as string)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {(data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">暂无记录</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Dashboard 主页面 ───

function Dashboard() {
  const user = useAuthStore(s => s.user)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground mt-1">
          欢迎回来，{user?.nickname ?? user?.username ?? "管理员"}！以下是系统概览。
        </p>
      </div>

      <OverviewCards />
      <NoticeBoard />

      <div className="grid gap-6 lg:grid-cols-3">
        <LoginTrendChart />
        <ApiStatsCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ErrorTrendChart />
        <RecentLoginsCard />
      </div>
    </div>
  )
}

export default Dashboard
