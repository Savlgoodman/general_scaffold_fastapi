import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, RefreshCw, Pencil, Trash2, Send, Undo2, Pin } from 'lucide-react'
import { getNotices } from '@/api/generated/notices/notices'
import type { AdminNotice } from '@/api/generated/model'
import { TableSkeleton } from '@/components/skeletons'

const MDEditor = lazy(() => import('@uiw/react-md-editor'))

const noticesApi = getNotices()

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  published: { label: '已发布', variant: 'default' },
  withdrawn: { label: '已撤回', variant: 'destructive' },
}

const typeConfig: Record<string, string> = {
  notice: '通知',
  announcement: '公告',
}

interface FormData {
  title: string
  content: string
  type: string
}

const initialForm: FormData = { title: '', content: '', type: 'notice' }

export default function NoticeManagement() {
  const { toast } = useToast()
  const [notices, setNotices] = useState<AdminNotice[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTitle, setDialogTitle] = useState('创建公告')
  const [form, setForm] = useState<FormData>(initialForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchNotices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await noticesApi.listNotices({
        pageNum: current, pageSize,
        keyword: keyword || undefined,
        status: statusFilter || undefined,
      })
      if (res.code === 200 && res.data) {
        setNotices(res.data.records || [])
        setTotal(res.data.total || 0)
      }
    } catch {
      toast({ title: '获取公告列表失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [current, pageSize, keyword, statusFilter, toast])

  useEffect(() => { fetchNotices() }, [fetchNotices])

  const openCreate = () => {
    setDialogTitle('创建公告'); setForm(initialForm); setEditingId(null); setDialogOpen(true)
  }

  const openEdit = async (notice: AdminNotice) => {
    setDialogTitle('编辑公告'); setEditingId(notice.id ?? null)
    setForm({ title: notice.title || '', content: notice.content || '', type: notice.type || 'notice' })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast({ title: '请填写标题', variant: 'destructive' }); return }
    if (form.type === 'announcement' && !form.content.trim()) { toast({ title: '公告内容不能为空', variant: 'destructive' }); return }
    setFormLoading(true)
    try {
      if (editingId) {
        const res = await noticesApi.updateNotice(editingId, form)
        if (res.code === 200) { toast({ title: '更新成功' }); setDialogOpen(false); fetchNotices() }
        else toast({ title: '更新失败', description: res.message, variant: 'destructive' })
      } else {
        const res = await noticesApi.createNotice(form)
        if (res.code === 200) { toast({ title: '创建成功' }); setDialogOpen(false); fetchNotices() }
        else toast({ title: '创建失败', description: res.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeleteLoading(true)
    try {
      const res = await noticesApi.deleteNotice(deletingId)
      if (res.code === 200) { toast({ title: '删除成功' }); setDeleteOpen(false); fetchNotices() }
      else toast({ title: '删除失败', description: res.message, variant: 'destructive' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handlePublish = async (id: number) => {
    try {
      const res = await noticesApi.publishNotice(id)
      if (res.code === 200) { toast({ title: '发布成功' }); fetchNotices() }
      else toast({ title: '发布失败', description: res.message, variant: 'destructive' })
    } catch { toast({ title: '发布失败', variant: 'destructive' }) }
  }

  const handleWithdraw = async (id: number) => {
    try {
      const res = await noticesApi.withdrawNotice(id)
      if (res.code === 200) { toast({ title: '撤回成功' }); fetchNotices() }
      else toast({ title: '撤回失败', description: res.message, variant: 'destructive' })
    } catch { toast({ title: '撤回失败', variant: 'destructive' }) }
  }

  const handleToggleTop = async (id: number) => {
    try {
      const res = await noticesApi.toggleNoticeTop(id)
      if (res.code === 200) { toast({ title: '操作成功' }); fetchNotices() }
      else toast({ title: '操作失败', description: res.message, variant: 'destructive' })
    } catch { toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">通知公告</h1>
          <p className="text-muted-foreground mt-1">管理系统通知与公告</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />创建公告</Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">公告列表</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索标题..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchNotices()} className="pl-9 h-9" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setCurrent(1) }}>
                <SelectTrigger className="w-28 h-9"><SelectValue placeholder="状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="published">已发布</SelectItem>
                  <SelectItem value="withdrawn">已撤回</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchNotices} disabled={loading}>
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
                  <TableHead className="text-center">标题</TableHead>
                  <TableHead className="w-20 text-center">类型</TableHead>
                  <TableHead className="w-20 text-center">状态</TableHead>
                  <TableHead className="w-16 text-center">置顶</TableHead>
                  <TableHead className="text-center">发布者</TableHead>
                  <TableHead className="w-40 text-center">发布时间</TableHead>
                  <TableHead className="w-36 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="p-0"><TableSkeleton rows={5} cols={7} /></TableCell></TableRow>
                ) : notices.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : notices.map((n, i) => {
                  const s = statusConfig[n.status ?? ''] ?? { label: n.status, variant: 'secondary' as const }
                  return (
                    <TableRow key={n.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <TableCell className="text-center font-mono text-sm py-2.5">{n.id}</TableCell>
                      <TableCell className="py-2.5 font-medium">
                        {n.isTop === 1 && <Badge className="bg-red-500 text-white text-xs mr-2">置顶</Badge>}
                        {n.title}
                      </TableCell>
                      <TableCell className="text-center py-2.5"><Badge variant="outline" className="text-xs">{typeConfig[n.type ?? ''] ?? n.type}</Badge></TableCell>
                      <TableCell className="text-center py-2.5"><Badge variant={s.variant} className="text-xs">{s.label}</Badge></TableCell>
                      <TableCell className="text-center py-2.5">{n.isTop === 1 ? '是' : '-'}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm">{(n as any).publisherName || '-'}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm">{n.publishTime?.replace('T', ' ').substring(0, 19) || '-'}</TableCell>
                      <TableCell className="text-center py-2.5">
                        <div className="flex justify-center gap-1">
                          {n.status === 'draft' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="发布" onClick={() => n.id && handlePublish(n.id)}><Send className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="编辑" onClick={() => openEdit(n)}><Pencil className="w-3.5 h-3.5" /></Button>
                            </>
                          )}
                          {n.status === 'published' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="撤回" onClick={() => n.id && handleWithdraw(n.id)}><Undo2 className="w-3.5 h-3.5" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="置顶" onClick={() => n.id && handleToggleTop(n.id)}><Pin className={`w-3.5 h-3.5 ${n.isTop === 1 ? 'text-red-500' : ''}`} /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="删除" onClick={() => { setDeletingId(n.id ?? null); setDeleteOpen(true) }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
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
                    <SelectItem value="10">10条/页</SelectItem>
                    <SelectItem value="20">20条/页</SelectItem>
                    <SelectItem value="50">50条/页</SelectItem>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={form.type === 'announcement' ? 'sm:max-w-3xl' : 'sm:max-w-lg'}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {form.type === 'notice' ? '通知仅在 Header 轮播展示标题' : editingId ? '修改公告内容（支持 Markdown）' : '创建新公告（支持 Markdown）'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>类型</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, content: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="notice">通知（Header 轮播）</SelectItem>
                  <SelectItem value="announcement">公告（Dashboard 展示）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>标题 <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={form.type === 'notice' ? '通知标题（将在 Header 轮播展示）' : '公告标题'} />
            </div>
            {form.type === 'notice' ? (
              <div className="grid gap-2">
                <Label>内容 <span className="text-muted-foreground text-xs">（选填，不超过 60 字）</span></Label>
                <Input
                  value={form.content}
                  onChange={(e) => { if (e.target.value.length <= 60) setForm({ ...form, content: e.target.value }) }}
                  placeholder="可选填写简短说明"
                  maxLength={60}
                />
                <span className="text-xs text-muted-foreground text-right">{form.content.length}/60</span>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>内容 <span className="text-destructive">*</span></Label>
                <Suspense fallback={<div className="h-64 bg-muted rounded animate-pulse" />}>
                  <div data-color-mode="light">
                    <MDEditor
                      value={form.content}
                      onChange={(v) => setForm({ ...form, content: v || '' })}
                      height={300}
                      preview="edit"
                    />
                  </div>
                </Suspense>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={formLoading}>{formLoading ? '提交中...' : editingId ? '保存' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle><DialogDescription>删除后无法恢复，确定要删除该公告吗？</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>{deleteLoading ? '删除中...' : '确认删除'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
