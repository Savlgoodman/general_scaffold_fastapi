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
import { getLogOperation } from '@/api/generated/log-operation/log-operation'
import type { AdminOperationLog } from '@/api/generated/model'
import { TableSkeleton } from '@/components/skeletons'
import JsonPreview from './components/JsonPreview'

const logApi = getLogOperation()

const typeColors: Record<string, string> = {
  CREATE: 'bg-green-500', UPDATE: 'bg-amber-500', DELETE: 'bg-red-500',
}
const typeLabels: Record<string, string> = {
  CREATE: '新增', UPDATE: '修改', DELETE: '删除',
}

export default function OperationLogPage() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AdminOperationLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [detail, setDetail] = useState<AdminOperationLog | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await logApi.listOperationLogs({
        pageNum: current, pageSize,
        keyword: keyword || undefined,
        type: typeFilter || undefined,
      })
      if (res.code === 200 && res.data) {
        setLogs(res.data.records || [])
        setTotal(res.data.total || 0)
      }
    } catch {
      toast({ title: '获取操作日志失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [current, pageSize, keyword, typeFilter, toast])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">操作日志</h1>
        <p className="text-muted-foreground mt-1">查看系统操作审计记录</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">操作记录</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索用户名..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchLogs()} className="pl-9 h-9" />
              </div>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setCurrent(1) }}>
                <SelectTrigger className="w-28 h-9"><SelectValue placeholder="操作类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="CREATE">新增</SelectItem>
                  <SelectItem value="UPDATE">修改</SelectItem>
                  <SelectItem value="DELETE">删除</SelectItem>
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
                  <TableHead className="text-center">用户</TableHead>
                  <TableHead className="text-center">模块</TableHead>
                  <TableHead className="w-20 text-center">操作</TableHead>
                  <TableHead className="text-center">方法</TableHead>
                  <TableHead className="text-center">IP</TableHead>
                  <TableHead className="w-44 text-center">时间</TableHead>
                  <TableHead className="w-16 text-center">详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="p-0"><TableSkeleton rows={8} cols={8} /></TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : logs.map((log, i) => (
                  <TableRow key={log.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <TableCell className="text-center font-mono text-sm py-2.5">{log.id}</TableCell>
                    <TableCell className="text-center py-2.5">{log.username || '-'}</TableCell>
                    <TableCell className="text-center py-2.5">{log.module}</TableCell>
                    <TableCell className="text-center py-2.5">
                      <Badge className={`${typeColors[log.operation ?? ''] ?? 'bg-gray-500'} text-white text-xs`}>{typeLabels[log.operation ?? ''] ?? log.operation}</Badge>
                    </TableCell>
                    <TableCell className="text-center py-2.5 font-mono text-xs truncate max-w-xs">{log.methodName}</TableCell>
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
          <DialogHeader><DialogTitle>操作日志详情 #{detail?.id}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">用户：</span>{detail.username || '-'} (ID: {detail.userId || '-'})</div>
                <div><span className="text-muted-foreground">操作：</span><Badge className={`${typeColors[detail.operation ?? ''] ?? 'bg-gray-500'} text-white text-xs`}>{typeLabels[detail.operation ?? ''] ?? detail.operation}</Badge></div>
                <div><span className="text-muted-foreground">模块：</span>{detail.module}</div>
                <div><span className="text-muted-foreground">IP：</span>{detail.ip}</div>
                <div className="col-span-2"><span className="text-muted-foreground">方法：</span><code className="bg-muted px-1.5 py-0.5 rounded text-xs">{detail.methodName}</code></div>
                <div className="col-span-2"><span className="text-muted-foreground">时间：</span>{detail.createTime?.replace('T', ' ')}</div>
              </div>
              {detail.requestParams && <JsonPreview label="请求参数" content={detail.requestParams} />}
              {detail.oldData && <JsonPreview label="操作前数据" content={detail.oldData} />}
              {detail.newData && <JsonPreview label="操作后数据" content={detail.newData} />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
