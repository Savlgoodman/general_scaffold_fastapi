import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, Cpu, MemoryStick, HardDrive, Database, Server, Activity } from 'lucide-react'
import { getSystemMonitor } from '@/api/generated/system-monitor/system-monitor'
import type { SystemInfoVO } from '@/api/generated/model'
import { CardGroupSkeleton } from '@/components/skeletons'

const monitorApi = getSystemMonitor()

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i]
}

function ProgressBar({ value, color = 'bg-primary' }: { value: number; color?: string }) {
  const barColor = value > 90 ? 'bg-red-500' : value > 70 ? 'bg-amber-500' : color
  return (
    <div className="w-full bg-muted rounded-full h-2.5">
      <div className={`h-2.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value ?? '-'}</span>
    </div>
  )
}

export default function SystemMonitor() {
  const { toast } = useToast()
  const [info, setInfo] = useState<SystemInfoVO | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchInfo = useCallback(async () => {
    setLoading(true)
    try {
      const res = await monitorApi.getSystemInfo()
      if (res.code === 200 && res.data) {
        setInfo(res.data)
      }
    } catch {
      toast({ title: '获取系统监控信息失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchInfo() }, [fetchInfo])

  if (loading && !info) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">系统监控</h1>
          <p className="text-muted-foreground mt-1">实时查看系统运行状态</p>
        </div>
        <CardGroupSkeleton groups={3} itemsPerGroup={2} />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">系统监控</h1>
          <p className="text-muted-foreground mt-1">实时查看系统运行状态</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInfo} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />刷新
        </Button>
      </div>

      {info && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* CPU */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Cpu className="w-4 h-4" />CPU</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{((info.cpu?.userUsage ?? 0) + (info.cpu?.systemUsage ?? 0)).toFixed(1)}%</span>
                <Badge variant="outline">{info.cpu?.coreCount} 核</Badge>
              </div>
              <ProgressBar value={(info.cpu?.userUsage ?? 0) + (info.cpu?.systemUsage ?? 0)} />
              <InfoRow label="用户使用" value={`${info.cpu?.userUsage ?? 0}%`} />
              <InfoRow label="系统使用" value={`${info.cpu?.systemUsage ?? 0}%`} />
              <InfoRow label="空闲" value={`${info.cpu?.idle ?? 0}%`} />
            </CardContent>
          </Card>

          {/* 内存 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><MemoryStick className="w-4 h-4" />内存</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{info.memory?.usageRate ?? 0}%</span>
                <Badge variant="outline">{formatBytes(info.memory?.total)}</Badge>
              </div>
              <ProgressBar value={info.memory?.usageRate ?? 0} />
              <InfoRow label="已用" value={formatBytes(info.memory?.used)} />
              <InfoRow label="可用" value={formatBytes(info.memory?.available)} />
            </CardContent>
          </Card>

          {/* JVM */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4" />JVM</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">{info.jvm?.usageRate ?? 0}%</span>
                <Badge variant="outline">Java {info.jvm?.javaVersion}</Badge>
              </div>
              <ProgressBar value={info.jvm?.usageRate ?? 0} />
              <InfoRow label="已用" value={formatBytes(info.jvm?.usedMemory)} />
              <InfoRow label="已分配" value={formatBytes(info.jvm?.totalMemory)} />
              <InfoRow label="最大" value={formatBytes(info.jvm?.maxMemory)} />
              <InfoRow label="运行时长" value={info.jvm?.uptime} />
            </CardContent>
          </Card>

          {/* 磁盘 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><HardDrive className="w-4 h-4" />磁盘</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {info.disks?.map((disk, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{disk.mount}</span>
                    <span className="text-sm text-muted-foreground">{disk.usageRate}%</span>
                  </div>
                  <ProgressBar value={disk.usageRate ?? 0} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>已用 {formatBytes(disk.used)}</span>
                    <span>共 {formatBytes(disk.total)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Redis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" />Redis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="版本" value={info.redis?.version} />
              <InfoRow label="已用内存" value={info.redis?.usedMemory} />
              <InfoRow label="连接数" value={info.redis?.connectedClients} />
              <InfoRow label="运行天数" value={info.redis?.uptimeDays} />
              <InfoRow label="Key 统计" value={info.redis?.keyCount} />
            </CardContent>
          </Card>

          {/* 数据库连接池 + 服务器 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Server className="w-4 h-4" />服务器 & 连接池</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="操作系统" value={info.server?.osName} />
              <InfoRow label="架构" value={info.server?.osArch} />
              <InfoRow label="主机名" value={info.server?.hostName} />
              <InfoRow label="IP" value={info.server?.ip} />
              <div className="border-t my-2" />
              <InfoRow label="活跃连接" value={info.dbPool?.activeConnections} />
              <InfoRow label="空闲连接" value={info.dbPool?.idleConnections} />
              <InfoRow label="总连接数" value={info.dbPool?.totalConnections} />
              <InfoRow label="等待线程" value={info.dbPool?.threadsAwaitingConnection} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
