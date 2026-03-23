import { useState, useEffect, useCallback } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Search, RefreshCw, Eye } from 'lucide-react'
import { getLogLogin } from '@/api/generated/log-login/log-login'
import type { AdminLoginLog } from '@/api/generated/model'
import { TableSkeleton } from '@/components/skeletons'

const logApi = getLogLogin()

const statusMap: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
  success: { label: '成功', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
  locked: { label: '锁定', variant: 'secondary' },
  disabled: { label: '禁用', variant: 'secondary' },
}

export default function LoginLogPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AdminLoginLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string>('')
  const [detail, setDetail] = useState<AdminLoginLog | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await logApi.listLoginLogs({
        pageNum: current, pageSize,
        keyword: keyword || undefined,
        status: status || undefined,
      })
      if (res.code === 200 && res.data) {
        setLogs(res.data.records || [])
        setTotal(res.data.total || 0)
      }
    } catch {
      toast({ title: '获取登录日志失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [current, pageSize, keyword, status, toast])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">登录日志</h1>
        <p className="text-muted-foreground mt-1">查看用户登录记录</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">登录记录</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索用户名..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchLogs()} className="pl-9 h-9" />
              </div>
              <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setCurrent(1) }}>
                <SelectTrigger className="w-28 h-9"><SelectValue placeholder="登录状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                  <SelectItem value="locked">锁定</SelectItem>
                  <SelectItem value="disabled">禁用</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />刷新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden mx-4 mb-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-14 text-center h-10">ID</TableHead>
                  <TableHead className="text-center">用户名</TableHead>
                  <TableHead className="w-20 text-center">状态</TableHead>
                  <TableHead className="text-center">消息</TableHead>
                  <TableHead className="text-center">IP</TableHead>
                  <TableHead className="w-44 text-center">时间</TableHead>
                  <TableHead className="w-16 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="p-0"><TableSkeleton rows={8} cols={7} /></TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : logs.map((log, i) => {
                  const s = statusMap[log.status ?? ''] ?? { label: log.status, variant: 'secondary' as const }
                  return (
                    <TableRow key={log.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <TableCell className="text-center font-mono text-sm py-2.5">{log.id}</TableCell>
                      <TableCell className="text-center font-medium py-2.5">{log.username}</TableCell>
                      <TableCell className="text-center py-2.5"><Badge variant={s.variant} className="text-xs">{s.label}</Badge></TableCell>
                      <TableCell className="text-center py-2.5 text-sm truncate max-w-xs">{log.message || '-'}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm">{log.ip}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm">{log.createTime?.replace('T', ' ').substring(0, 19)}</TableCell>
                      <TableCell className="text-center py-2.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetail(log)}><Eye className="w-3.5 h-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {total > 0 && (
            <div className="flex items-center justify-between px-4 pb-4">
              <div className="text-sm text-muted-foreground">共 {total} 条，第 {current}/{totalPages} 页</div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrent(1) }}>
                  <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20条/页</SelectItem>
                    <SelectItem value="50">50条/页</SelectItem>
                    <SelectItem value="100">100条/页</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 w-16" onClick={() => setCurrent(c => c - 1)} disabled={current <= 1}>上一页</Button>
                  <span className="text-sm px-2">{current} / {totalPages}</span>
                  <Button variant="outline" size="sm" className="h-8 w-16" onClick={() => setCurrent(c => c + 1)} disabled={current >= totalPages}>下一页</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>登录日志详情 #{detail?.id}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">用户名：</span>{detail.username}</div>
                <div><span className="text-muted-foreground">状态：</span><Badge variant={statusMap[detail.status ?? '']?.variant ?? 'secondary'} className="text-xs">{statusMap[detail.status ?? '']?.label ?? detail.status}</Badge></div>
                <div><span className="text-muted-foreground">IP：</span>{detail.ip}</div>
                <div><span className="text-muted-foreground">时间：</span>{detail.createTime?.replace('T', ' ')}</div>
              </div>
              {detail.message && <div><span className="text-muted-foreground">消息：</span>{detail.message}</div>}
              {detail.userAgent && <div><span className="text-muted-foreground">User-Agent：</span><span className="text-xs break-all">{detail.userAgent}</span></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
