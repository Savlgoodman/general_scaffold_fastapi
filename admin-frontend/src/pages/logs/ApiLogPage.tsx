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
import { getLogApi } from '@/api/generated/log-api/log-api'
import type { AdminApiLog } from '@/api/generated/model'
import { TableSkeleton } from '@/components/skeletons'
import JsonPreview from './components/JsonPreview'

const logApi = getLogApi()

function MethodBadge({ method }: { method?: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-blue-500', POST: 'bg-green-500', PUT: 'bg-amber-500', DELETE: 'bg-red-500',
  }
  return <Badge className={`${colors[method ?? ''] ?? 'bg-gray-500'} text-white text-xs w-16 justify-center`}>{method}</Badge>
}

export default function ApiLogPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AdminApiLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [method, setMethod] = useState<string>('')
  const [detail, setDetail] = useState<AdminApiLog | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await logApi.listApiLogs({
        pageNum: current, pageSize,
        keyword: keyword || undefined,
        method: method || undefined,
      })
      if (res.code === 200 && res.data) {
        setLogs(res.data.records || [])
        setTotal(res.data.total || 0)
      }
    } catch {
      toast({ title: '获取API日志失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [current, pageSize, keyword, method, toast])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API 日志</h1>
        <p className="text-muted-foreground mt-1">查看系统 API 请求记录</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">请求日志</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索路径/用户..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchLogs()} className="pl-9 h-9" />
              </div>
              <Select value={method} onValueChange={(v) => { setMethod(v === 'all' ? '' : v); setCurrent(1) }}>
                <SelectTrigger className="w-28 h-9"><SelectValue placeholder="请求方法" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部方法</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
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
                  <TableHead className="w-20 text-center">方法</TableHead>
                  <TableHead className="text-center">路径</TableHead>
                  <TableHead className="text-center">用户</TableHead>
                  <TableHead className="w-20 text-center">状态码</TableHead>
                  <TableHead className="w-20 text-center">耗时</TableHead>
                  <TableHead className="text-center">IP</TableHead>
                  <TableHead className="w-40 text-center">时间</TableHead>
                  <TableHead className="w-16 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="p-0"><TableSkeleton rows={8} cols={10} /></TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : logs.map((log, i) => (
                  <TableRow key={log.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <TableCell className="text-center font-mono text-sm py-2.5">{log.id}</TableCell>
                    <TableCell className="text-center py-2.5"><MethodBadge method={log.method} /></TableCell>
                    <TableCell className="py-2.5 max-w-xs" title={log.path}>
                      <div className="font-mono text-sm truncate">{log.path}</div>
                      {(log as any).apiName && <div className="text-xs text-muted-foreground mt-0.5">{(log as any).apiName}</div>}
                    </TableCell>
                    <TableCell className="text-center py-2.5">{log.username || '-'}</TableCell>
                    <TableCell className="text-center py-2.5">
                      <Badge variant={log.responseCode === 200 ? 'default' : 'destructive'} className="text-xs">{log.responseCode}</Badge>
                    </TableCell>
                    <TableCell className="text-center py-2.5 font-mono text-sm">{log.durationMs}ms</TableCell>
                    <TableCell className="text-center py-2.5 text-sm">{log.ip}</TableCell>
                    <TableCell className="text-center py-2.5 text-sm">{log.createTime?.replace('T', ' ').substring(0, 19)}</TableCell>
                    <TableCell className="text-center py-2.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetail(log)}><Eye className="w-3.5 h-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
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
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>API 日志详情 #{detail?.id}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">方法：</span><MethodBadge method={detail.method} /></div>
                <div><span className="text-muted-foreground">状态码：</span><Badge variant={detail.responseCode === 200 ? 'default' : 'destructive'}>{detail.responseCode}</Badge></div>
                <div><span className="text-muted-foreground">用户：</span>{detail.username || '-'} (ID: {detail.userId || '-'})</div>
                <div><span className="text-muted-foreground">耗时：</span>{detail.durationMs}ms</div>
                <div><span className="text-muted-foreground">IP：</span>{detail.ip}</div>
                <div><span className="text-muted-foreground">时间：</span>{detail.createTime?.replace('T', ' ')}</div>
              </div>
              <div><span className="text-muted-foreground">路径：</span><code className="bg-muted px-1.5 py-0.5 rounded text-xs">{detail.path}</code></div>
              {(detail as any).apiName && <div><span className="text-muted-foreground">API名称：</span>{(detail as any).apiName}</div>}
              {detail.queryParams && <div><span className="text-muted-foreground">查询参数：</span><pre className="bg-muted p-2 rounded mt-1 text-xs overflow-x-auto whitespace-pre-wrap break-all">{detail.queryParams}</pre></div>}
              {detail.requestBody && <JsonPreview label="请求体" content={detail.requestBody} />}
              {detail.responseBody && <JsonPreview label="响应体" content={detail.responseBody} />}
              {detail.userAgent && <div><span className="text-muted-foreground">User-Agent：</span><span className="text-xs break-all">{detail.userAgent}</span></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
