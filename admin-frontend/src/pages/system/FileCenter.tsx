import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Upload, RefreshCw, Trash2, Eye, Search, Undo2, Image, FileText, Copy, ExternalLink } from 'lucide-react'
import { getFiles } from '@/api/generated/files/files'
import type { AdminFile } from '@/api/generated/model'
import { AXIOS_INSTANCE } from '@/api/custom-instance'
import { TableSkeleton } from '@/components/skeletons'
import { Separator } from '@/components/ui/separator'

const filesApi = getFiles()

function formatSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function isImage(name?: string): boolean {
  return name ? /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name) : false
}

const categoryLabels: Record<string, string> = {
  avatar: '头像', general: '通用', document: '文档', image: '图片',
}

export default function FileCenter() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 文件列表
  const [files, setFiles] = useState<AdminFile[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [pageSize] = useState(20)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [uploading, setUploading] = useState(false)

  // 回收站
  const [recycleFiles, setRecycleFiles] = useState<AdminFile[]>([])
  const [recycleLoading, setRecycleLoading] = useState(false)
  const [recycleTotal, setRecycleTotal] = useState(0)
  const [recycleCurrent, setRecycleCurrent] = useState(1)

  // 详情/删除弹窗
  const [detailFile, setDetailFile] = useState<AdminFile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminFile | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await filesApi.listFiles({
        pageNum: current, pageSize,
        keyword: keyword || undefined,
        category: category || undefined,
        status: 'active',
      })
      if (res.code === 200 && res.data) {
        setFiles(res.data.records || [])
        setTotal(res.data.total || 0)
      }
    } catch { toast({ title: '获取文件列表失败', variant: 'destructive' }) }
    finally { setLoading(false) }
  }, [current, pageSize, keyword, category, toast])

  const fetchRecycle = useCallback(async () => {
    setRecycleLoading(true)
    try {
      const res = await filesApi.listRecycleBin({ pageNum: recycleCurrent, pageSize: 20 })
      if (res.code === 200 && res.data) {
        setRecycleFiles(res.data.records || [])
        setRecycleTotal(res.data.total || 0)
      }
    } catch { toast({ title: '获取回收站失败', variant: 'destructive' }) }
    finally { setRecycleLoading(false) }
  }, [recycleCurrent, toast])

  useEffect(() => { fetchFiles() }, [fetchFiles])
  useEffect(() => { fetchRecycle() }, [fetchRecycle])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await AXIOS_INSTANCE.post('/api/admin/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { category: category || undefined },
      })
      if (res.data?.code === 200) { toast({ title: '上传成功' }); fetchFiles() }
      else toast({ title: '上传失败', description: res.data?.message, variant: 'destructive' })
    } catch { toast({ title: '上传失败', variant: 'destructive' }) }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const handleRecycle = async (id: number) => {
    try {
      const res = await filesApi.recycleFile(id)
      if (res.code === 200) { toast({ title: '已移入回收站' }); fetchFiles(); fetchRecycle() }
      else toast({ title: '操作失败', description: res.message, variant: 'destructive' })
    } catch { toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const handleRestoreAll = async () => {
    let count = 0
    for (const f of recycleFiles) {
      if (!f.id) continue
      try {
        const res = await filesApi.restoreFile(f.id)
        if (res.code === 200) count++
      } catch { /* skip */ }
    }
    toast({ title: `已还原 ${count} 个文件` })
    fetchFiles(); fetchRecycle()
  }

  const handleRestore = async (id: number) => {
    try {
      const res = await filesApi.restoreFile(id)
      if (res.code === 200) { toast({ title: '已恢复' }); fetchFiles(); fetchRecycle() }
      else toast({ title: '操作失败', description: res.message, variant: 'destructive' })
    } catch { toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const handleDeletePermanently = async () => {
    if (!deleteTarget?.id) return
    setDeleting(true)
    try {
      const res = await filesApi.deleteFilePermanently(deleteTarget.id)
      if (res.code === 200) { toast({ title: '已彻底删除' }); setDeleteTarget(null); fetchFiles(); fetchRecycle() }
      else toast({ title: '删除失败', description: res.message, variant: 'destructive' })
    } catch { toast({ title: '删除失败', variant: 'destructive' }) }
    finally { setDeleting(false) }
  }

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast({ title: '已复制' }) }

  const totalPages = Math.ceil(total / pageSize)
  const recycleTotalPages = Math.ceil(recycleTotal / 20)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">文件中心</h1>
        <p className="text-muted-foreground mt-1">管理 MinIO 对象存储中的文件</p>
      </div>

      <Tabs defaultValue="files">
        <TabsList>
          <TabsTrigger value="files">文件列表</TabsTrigger>
          <TabsTrigger value="recycle">回收站 ({recycleTotal})</TabsTrigger>
        </TabsList>

        {/* 文件列表 */}
        <TabsContent value="files">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">文件列表</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="搜索文件名..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchFiles()} className="pl-9 h-9" />
                  </div>
                  <Select value={category} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setCurrent(1) }}>
                    <SelectTrigger className="w-24 h-9"><SelectValue placeholder="分类" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="avatar">头像</SelectItem>
                      <SelectItem value="general">通用</SelectItem>
                      <SelectItem value="document">文档</SelectItem>
                      <SelectItem value="image">图片</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4 mr-1.5" />{uploading ? '上传中...' : '上传'}
                  </Button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                  <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading}>
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
                      <TableHead className="text-center">文件名</TableHead>
                      <TableHead className="w-20 text-center">分类</TableHead>
                      <TableHead className="w-20 text-center">大小</TableHead>
                      <TableHead className="text-center">上传者</TableHead>
                      <TableHead className="w-40 text-center">上传时间</TableHead>
                      <TableHead className="w-28 text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="p-0"><TableSkeleton rows={6} cols={7} /></TableCell></TableRow>
                    ) : files.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">暂无文件</TableCell></TableRow>
                    ) : files.map((f, i) => (
                      <TableRow key={f.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="text-center font-mono text-sm py-2.5">{f.id}</TableCell>
                        <TableCell className="py-2.5 font-medium truncate max-w-xs" title={f.fileName}>{f.fileName}</TableCell>
                        <TableCell className="text-center py-2.5"><Badge variant="outline" className="text-xs">{categoryLabels[f.category ?? ''] ?? f.category}</Badge></TableCell>
                        <TableCell className="text-center py-2.5 text-sm">{formatSize(f.size)}</TableCell>
                        <TableCell className="text-center py-2.5 text-sm">{f.uploaderName || '-'}</TableCell>
                        <TableCell className="text-center py-2.5 text-sm">{f.createTime?.replace('T', ' ').substring(0, 19)}</TableCell>
                        <TableCell className="text-center py-2.5">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="详情" onClick={() => setDetailFile(f)}><Eye className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="回收站" onClick={() => f.id && handleRecycle(f.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {total > 0 && (
                <div className="flex items-center justify-between px-4 pb-4">
                  <div className="text-sm text-muted-foreground">共 {total} 个文件</div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-16" onClick={() => setCurrent(c => c - 1)} disabled={current <= 1}>上一页</Button>
                    <span className="text-sm px-2">{current} / {totalPages}</span>
                    <Button variant="outline" size="sm" className="h-8 w-16" onClick={() => setCurrent(c => c + 1)} disabled={current >= totalPages}>下一页</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 回收站 */}
        <TabsContent value="recycle">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">回收站</CardTitle>
                <div className="flex items-center gap-2">
                  {recycleFiles.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleRestoreAll}>
                      <Undo2 className="w-4 h-4 mr-1.5" />全部还原
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={fetchRecycle} disabled={recycleLoading}>
                    <RefreshCw className={`w-4 h-4 mr-1.5 ${recycleLoading ? 'animate-spin' : ''}`} />刷新
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
                      <TableHead className="text-center">文件名</TableHead>
                      <TableHead className="w-20 text-center">分类</TableHead>
                      <TableHead className="w-20 text-center">大小</TableHead>
                      <TableHead className="w-40 text-center">删除时间</TableHead>
                      <TableHead className="w-28 text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recycleLoading ? (
                      <TableRow><TableCell colSpan={6} className="p-0"><TableSkeleton rows={4} cols={6} /></TableCell></TableRow>
                    ) : recycleFiles.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">回收站为空</TableCell></TableRow>
                    ) : recycleFiles.map((f, i) => (
                      <TableRow key={f.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <TableCell className="text-center font-mono text-sm py-2.5">{f.id}</TableCell>
                        <TableCell className="py-2.5 truncate max-w-xs">{f.fileName}</TableCell>
                        <TableCell className="text-center py-2.5"><Badge variant="outline" className="text-xs">{categoryLabels[f.category ?? ''] ?? f.category}</Badge></TableCell>
                        <TableCell className="text-center py-2.5 text-sm">{formatSize(f.size)}</TableCell>
                        <TableCell className="text-center py-2.5 text-sm">{f.deletedAt?.replace('T', ' ').substring(0, 19)}</TableCell>
                        <TableCell className="text-center py-2.5">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="恢复" onClick={() => f.id && handleRestore(f.id)}><Undo2 className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="彻底删除" onClick={() => setDeleteTarget(f)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {recycleTotal > 0 && (
                <div className="flex items-center justify-between px-4 pb-4">
                  <div className="text-sm text-muted-foreground">共 {recycleTotal} 个文件</div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-16" onClick={() => setRecycleCurrent(c => c - 1)} disabled={recycleCurrent <= 1}>上一页</Button>
                    <span className="text-sm px-2">{recycleCurrent} / {recycleTotalPages}</span>
                    <Button variant="outline" size="sm" className="h-8 w-16" onClick={() => setRecycleCurrent(c => c + 1)} disabled={recycleCurrent >= recycleTotalPages}>下一页</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 文件详情 */}
      <Dialog open={!!detailFile} onOpenChange={() => setDetailFile(null)}>
        <DialogContent className={isImage(detailFile?.fileName) ? 'sm:max-w-2xl' : 'sm:max-w-md'}>
          <DialogHeader><DialogTitle className="flex items-center gap-2">{isImage(detailFile?.fileName) ? <Image className="w-4 h-4" /> : <FileText className="w-4 h-4" />}文件详情</DialogTitle></DialogHeader>
          {detailFile && (
            <div className="space-y-4">
              {isImage(detailFile.fileName) && detailFile.url && (
                <div className="flex justify-center bg-muted/30 rounded-lg p-4">
                  <img src={detailFile.url} alt={detailFile.fileName} className="max-h-60 max-w-full rounded object-contain" />
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">文件名</span><span className="font-medium truncate">{detailFile.fileName}</span>
                <span className="text-muted-foreground">分类</span><span>{categoryLabels[detailFile.category ?? ''] ?? detailFile.category}</span>
                <span className="text-muted-foreground">大小</span><span>{formatSize(detailFile.size)}</span>
                <span className="text-muted-foreground">上传者</span><span>{detailFile.uploaderName || '-'}</span>
                <span className="text-muted-foreground">上传时间</span><span>{detailFile.createTime?.replace('T', ' ').substring(0, 19)}</span>
                <span className="text-muted-foreground">路径</span><span className="font-mono text-xs truncate">{detailFile.objectName}</span>
              </div>
              {detailFile.url && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => copyUrl(detailFile.url!)}><Copy className="w-3.5 h-3.5 mr-1.5" />复制链接</Button>
                    <Button variant="outline" size="sm" className="flex-1" asChild><a href={detailFile.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />新窗口打开</a></Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 彻底删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>彻底删除</DialogTitle><DialogDescription>文件将从 MinIO 和数据库中永久删除，无法恢复。确定吗？</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDeletePermanently} disabled={deleting}>{deleting ? '删除中...' : '彻底删除'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
