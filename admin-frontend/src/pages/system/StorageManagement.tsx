import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Upload, RefreshCw, Trash2, Eye, Search, FolderOpen } from 'lucide-react'
import { getFiles } from '@/api/generated/files/files'
import type { BucketFileVO } from '@/api/generated/model'
import { AXIOS_INSTANCE } from '@/api/custom-instance'
import { TableSkeleton } from '@/components/skeletons'

const filesApi = getFiles()

function formatSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function isImage(name: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)
}

export default function StorageManagement() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<BucketFileVO[]>([])
  const [loading, setLoading] = useState(false)
  const [prefix, setPrefix] = useState('')
  const [uploading, setUploading] = useState(false)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BucketFileVO | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await filesApi.listFiles({ prefix: prefix || undefined })
      if (res.code === 200 && res.data) {
        setFiles(res.data)
      }
    } catch {
      toast({ title: '获取文件列表失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [prefix, toast])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await AXIOS_INSTANCE.post('/api/admin/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { directory: prefix || undefined },
      })
      if (res.data?.code === 200) {
        toast({ title: '上传成功' })
        fetchFiles()
      } else {
        toast({ title: '上传失败', description: res.data?.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '上传失败', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.objectName) return
    setDeleting(true)
    try {
      const res = await filesApi.deleteFile({ objectName: deleteTarget.objectName })
      if (res.code === 200) {
        toast({ title: '删除成功' })
        setDeleteTarget(null)
        fetchFiles()
      } else {
        toast({ title: '删除失败', description: res.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">存储管理</h1>
        <p className="text-muted-foreground mt-1">管理 MinIO 对象存储中的文件</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">文件列表</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="按目录前缀筛选..."
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                  className="pl-9 h-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className={`w-4 h-4 mr-1.5 ${uploading ? 'animate-pulse' : ''}`} />{uploading ? '上传中...' : '上传文件'}
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
                  <TableHead className="text-center h-10">文件名</TableHead>
                  <TableHead className="text-center">路径</TableHead>
                  <TableHead className="w-24 text-center">大小</TableHead>
                  <TableHead className="w-40 text-center">修改时间</TableHead>
                  <TableHead className="w-24 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="p-0"><TableSkeleton rows={6} cols={5} /></TableCell></TableRow>
                ) : files.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">暂无文件</TableCell></TableRow>
                ) : files.map((f, i) => (
                  <TableRow key={f.objectName} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <TableCell className="py-2.5 font-medium">{f.fileName}</TableCell>
                    <TableCell className="py-2.5 font-mono text-xs text-muted-foreground truncate max-w-xs" title={f.objectName}>{f.objectName}</TableCell>
                    <TableCell className="text-center py-2.5 text-sm">{formatSize(f.size)}</TableCell>
                    <TableCell className="text-center py-2.5 text-sm">{f.lastModified?.replace('T', ' ').substring(0, 19) || '-'}</TableCell>
                    <TableCell className="text-center py-2.5">
                      <div className="flex justify-center gap-1">
                        {isImage(f.fileName || '') && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="预览" onClick={() => setPreviewUrl(`/api/admin/files/preview?objectName=${encodeURIComponent(f.objectName || '')}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="删除" onClick={() => setDeleteTarget(f)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 pb-4 text-sm text-muted-foreground">
            共 {files.length} 个文件
          </div>
        </CardContent>
      </Card>

      {/* ��片预览 */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>图片预览</DialogTitle></DialogHeader>
          {previewUrl && <img src={previewUrl} alt="预览" className="w-full rounded" />}
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>删除后无法恢复，确定要删除 "{deleteTarget?.fileName}" 吗？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? '删除中...' : '确认删除'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
