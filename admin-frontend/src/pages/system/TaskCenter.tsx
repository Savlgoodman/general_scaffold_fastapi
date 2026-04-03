import { useState, useEffect, useCallback } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Play, RefreshCw, Pencil, Eye } from 'lucide-react'
import { getTasks } from '@/api/generated/tasks/tasks'
import type { AdminTaskConfig, AdminTaskLog } from '@/api/generated/model'
import { TableSkeleton } from '@/components/skeletons'
import cronstrue from 'cronstrue/i18n'

const tasksApi = getTasks()

function describeCron(cron?: string): string {
  if (!cron) return '-'
  try {
    return cronstrue.toString(cron, { locale: 'zh_CN', use24HourTimeFormat: true })
  } catch {
    return '无效表达式'
  }
}

const statusBadge: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
  success: { label: '成功', variant: 'default' },
  failed: { label: '失败', variant: 'destructive' },
  running: { label: '执行中', variant: 'secondary' },
}

const groupLabels: Record<string, string> = {
  log: '日志', file: '文件', system: '系统',
}

export default function TaskCenter() {
  const { toast } = useToast()

  // 任务配置
  const [configs, setConfigs] = useState<AdminTaskConfig[]>([])
  const [configLoading, setConfigLoading] = useState(false)
  const [editConfig, setEditConfig] = useState<AdminTaskConfig | null>(null)
  const [editCron, setEditCron] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState<string | null>(null)

  // 执行日志
  const [logs, setLogs] = useState<AdminTaskLog[]>([])
  const [logLoading, setLogLoading] = useState(false)
  const [logTotal, setLogTotal] = useState(0)
  const [logCurrent, setLogCurrent] = useState(1)
  const [logTaskName, setLogTaskName] = useState('')
  const [logStatus, setLogStatus] = useState('')
  const [logDetail, setLogDetail] = useState<AdminTaskLog | null>(null)

  const fetchConfigs = useCallback(async () => {
    setConfigLoading(true)
    try {
      const res = await tasksApi.listTaskConfigs()
      if (res.code === 200 && res.data) setConfigs(res.data)
    } catch { toast({ title: '获取任务配置失败', variant: 'destructive' }) }
    finally { setConfigLoading(false) }
  }, [toast])

  const fetchLogs = useCallback(async () => {
    setLogLoading(true)
    try {
      const res = await tasksApi.listTaskLogs({
        pageNum: logCurrent, pageSize: 20,
        taskName: logTaskName || undefined,
        status: logStatus || undefined,
      })
      if (res.code === 200 && res.data) {
        setLogs(res.data.records || [])
        setLogTotal(res.data.total || 0)
      }
    } catch { toast({ title: '获取执行日志失败', variant: 'destructive' }) }
    finally { setLogLoading(false) }
  }, [logCurrent, logTaskName, logStatus, toast])

  useEffect(() => { fetchConfigs() }, [fetchConfigs])
  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleToggleEnabled = async (config: AdminTaskConfig) => {
    try {
      const res = await tasksApi.updateTaskConfig(config.id!, { enabled: config.enabled === 1 ? 0 : 1 })
      if (res.code === 200) { toast({ title: config.enabled === 1 ? '已停用' : '已启用' }); fetchConfigs() }
    } catch { toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const openEditDialog = (config: AdminTaskConfig) => {
    setEditConfig(config)
    setEditCron(config.cronExpression || '')
    setEditDesc(config.description || '')
  }

  const handleSaveConfig = async () => {
    if (!editConfig?.id || !editCron.trim()) return
    setSaving(true)
    try {
      const res = await tasksApi.updateTaskConfig(editConfig.id, { cronExpression: editCron, description: editDesc })
      if (res.code === 200) { toast({ title: '保存成功，下次触发生效' }); setEditConfig(null); fetchConfigs() }
      else toast({ title: '保存失败', description: res.message, variant: 'destructive' })
    } catch { toast({ title: '保存失败', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const handleRunManually = async (taskName: string) => {
    setRunning(taskName)
    try {
      const res = await tasksApi.runTaskManually(taskName)
      if (res.code === 200) { toast({ title: '任务已触发执行' }); fetchConfigs(); fetchLogs() }
      else toast({ title: '触发失败', description: res.message, variant: 'destructive' })
    } catch { toast({ title: '触发失败', variant: 'destructive' }) }
    finally { setRunning(null) }
  }

  const logTotalPages = Math.ceil(logTotal / 20)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">调度中心</h1>
        <p className="text-muted-foreground mt-1">管理定时任务配置与执行日志</p>
      </div>

      <Tabs defaultValue="configs">
        <TabsList>
          <TabsTrigger value="configs">任务配置</TabsTrigger>
          <TabsTrigger value="logs">执行日志</TabsTrigger>
        </TabsList>

        {/* 任务配置 */}
        <TabsContent value="configs">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">定时任务</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchConfigs} disabled={configLoading}>
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${configLoading ? 'animate-spin' : ''}`} />刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border rounded-lg overflow-hidden mx-4 mb-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-center h-10">任务名</TableHead>
                      <TableHead className="w-16 text-center">分组</TableHead>
                      <TableHead className="text-center">Cron</TableHead>
                      <TableHead className="w-16 text-center">状态</TableHead>
                      <TableHead className="w-40 text-center">上次执行</TableHead>
                      <TableHead className="w-20 text-center">结果</TableHead>
                      <TableHead className="w-28 text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configLoading ? (
                      <TableRow><TableCell colSpan={7} className="p-0"><TableSkeleton rows={6} cols={7} /></TableCell></TableRow>
                    ) : configs.map((c, i) => (
                      <TableRow key={c.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="py-2.5">
                          <div>
                            <span className="font-medium text-sm">{c.taskLabel}</span>
                            <span className="text-xs text-muted-foreground ml-2 font-mono">{c.taskName}</span>
                          </div>
                          {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                        </TableCell>
                        <TableCell className="text-center py-2.5"><Badge variant="outline" className="text-xs">{groupLabels[c.taskGroup ?? ''] ?? c.taskGroup}</Badge></TableCell>
                        <TableCell className="text-center py-2.5">
                          <div className="font-mono text-xs">{c.cronExpression}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{describeCron(c.cronExpression)}</div>
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <Switch checked={c.enabled === 1} onCheckedChange={() => handleToggleEnabled(c)} />
                        </TableCell>
                        <TableCell className="text-center py-2.5 text-sm">{c.lastRunTime?.replace('T', ' ').substring(0, 19) || '-'}</TableCell>
                        <TableCell className="text-center py-2.5">
                          {c.lastRunStatus ? (
                            <Badge variant={statusBadge[c.lastRunStatus]?.variant ?? 'secondary'} className="text-xs">
                              {statusBadge[c.lastRunStatus]?.label ?? c.lastRunStatus}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="编辑" onClick={() => openEditDialog(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="立即执行" disabled={running === c.taskName} onClick={() => c.taskName && handleRunManually(c.taskName)}>
                              <Play className={`w-3.5 h-3.5 ${running === c.taskName ? 'animate-pulse' : ''}`} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 执行日志 */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">执行日志</CardTitle>
                <div className="flex items-center gap-3">
                  <Select value={logTaskName} onValueChange={(v) => { setLogTaskName(v === 'all' ? '' : v); setLogCurrent(1) }}>
                    <SelectTrigger className="w-36 h-9"><SelectValue placeholder="任务名" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部任务</SelectItem>
                      {configs.map(c => <SelectItem key={c.taskName} value={c.taskName!}>{c.taskLabel}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={logStatus} onValueChange={(v) => { setLogStatus(v === 'all' ? '' : v); setLogCurrent(1) }}>
                    <SelectTrigger className="w-24 h-9"><SelectValue placeholder="状态" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="success">成功</SelectItem>
                      <SelectItem value="failed">失败</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logLoading}>
                    <RefreshCw className={`w-4 h-4 mr-1.5 ${logLoading ? 'animate-spin' : ''}`} />刷新
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
                      <TableHead className="text-center">任务</TableHead>
                      <TableHead className="w-20 text-center">状态</TableHead>
                      <TableHead className="w-20 text-center">耗时</TableHead>
                      <TableHead className="text-center">结果</TableHead>
                      <TableHead className="w-40 text-center">执行时间</TableHead>
                      <TableHead className="w-16 text-center">详情</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logLoading ? (
                      <TableRow><TableCell colSpan={7} className="p-0"><TableSkeleton rows={6} cols={7} /></TableCell></TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">暂无日志</TableCell></TableRow>
                    ) : logs.map((l, i) => {
                      const s = statusBadge[l.status ?? ''] ?? { label: l.status, variant: 'secondary' as const }
                      return (
                        <TableRow key={l.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <TableCell className="text-center font-mono text-sm py-2.5">{l.id}</TableCell>
                          <TableCell className="text-center py-2.5 text-sm">{l.taskName}</TableCell>
                          <TableCell className="text-center py-2.5"><Badge variant={s.variant} className="text-xs">{s.label}</Badge></TableCell>
                          <TableCell className="text-center py-2.5 font-mono text-sm">{l.durationMs != null ? `${l.durationMs}ms` : '-'}</TableCell>
                          <TableCell className="py-2.5 text-sm truncate max-w-xs">{l.detail || l.message || '-'}</TableCell>
                          <TableCell className="text-center py-2.5 text-sm">{l.createTime?.replace('T', ' ').substring(0, 19)}</TableCell>
                          <TableCell className="text-center py-2.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLogDetail(l)}><Eye className="w-3.5 h-3.5" /></Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {logTotal > 0 && (
                <div className="flex items-center justify-between px-4 pb-4">
                  <div className="text-sm text-muted-foreground">共 {logTotal} 条</div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-16" onClick={() => setLogCurrent(c => c - 1)} disabled={logCurrent <= 1}>上一页</Button>
                    <span className="text-sm px-2">{logCurrent} / {logTotalPages}</span>
                    <Button variant="outline" size="sm" className="h-8 w-16" onClick={() => setLogCurrent(c => c + 1)} disabled={logCurrent >= logTotalPages}>下一页</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 编辑 Cron 弹窗 */}
      <Dialog open={!!editConfig} onOpenChange={() => setEditConfig(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>编辑任务 — {editConfig?.taskLabel}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Cron 表达式</Label>
              <Input value={editCron} onChange={(e) => setEditCron(e.target.value)} placeholder="0 0 3 * * ?" className="font-mono" />
              <p className="text-xs text-primary mt-1">{describeCron(editCron)}</p>
              <p className="text-xs text-muted-foreground">修改后下次触发即生效，无需重启</p>
            </div>
            <div className="grid gap-2">
              <Label>描述</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditConfig(null)}>取消</Button>
            <Button onClick={handleSaveConfig} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 日志详情 */}
      <Dialog open={!!logDetail} onOpenChange={() => setLogDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>执行日志 #{logDetail?.id}</DialogTitle></DialogHeader>
          {logDetail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">任务：</span>{logDetail.taskName}</div>
                <div><span className="text-muted-foreground">状态：</span>
                  <Badge variant={statusBadge[logDetail.status ?? '']?.variant ?? 'secondary'} className="text-xs ml-1">
                    {statusBadge[logDetail.status ?? '']?.label ?? logDetail.status}
                  </Badge>
                </div>
                <div><span className="text-muted-foreground">耗时：</span>{logDetail.durationMs != null ? `${logDetail.durationMs}ms` : '-'}</div>
                <div><span className="text-muted-foreground">时间：</span>{logDetail.createTime?.replace('T', ' ')}</div>
              </div>
              {logDetail.detail && <div><span className="text-muted-foreground">结果：</span><pre className="bg-muted p-2 rounded mt-1 text-xs whitespace-pre-wrap">{logDetail.detail}</pre></div>}
              {logDetail.message && <div><span className="text-muted-foreground">错误：</span><pre className="bg-muted p-2 rounded mt-1 text-xs whitespace-pre-wrap text-destructive">{logDetail.message}</pre></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
