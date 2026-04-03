import { useState, useEffect, useCallback } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Pencil, Trash2, RefreshCw, Shield, Menu } from 'lucide-react'
import { getRoles } from '@/api/generated/roles/roles'
import type { RoleBaseVO } from '@/api/generated/model'
import RolePermissionDialog from './components/RolePermissionDialog'
import RoleMenuDialog from './components/RoleMenuDialog'
import { TableSkeleton } from '@/components/skeletons'

const rolesApi = getRoles()

interface RoleFormData {
  name: string
  code: string
  description: string
  status: number
}

const initialFormData: RoleFormData = { name: '', code: '', description: '', status: 1 }

export default function RoleManagement() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<RoleBaseVO[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchKeyword, setSearchKeyword] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTitle, setDialogTitle] = useState('创建角色')
  const [formData, setFormData] = useState<RoleFormData>(initialFormData)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)

  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [permRoleId, setPermRoleId] = useState<number | null>(null)
  const [permRoleName, setPermRoleName] = useState('')

  const [menuDialogOpen, setMenuDialogOpen] = useState(false)
  const [menuRoleId, setMenuRoleId] = useState<number | null>(null)
  const [menuRoleName, setMenuRoleName] = useState('')

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await rolesApi.listRoles({ pageNum: current, pageSize, keyword: searchKeyword || undefined })
      if (res.code === 200 && res.data) {
        setRoles(res.data.records || [])
        setTotal(res.data.total || 0)
        setCurrent(res.data.current || 1)
        setPageSize(res.data.size || 10)
      }
    } catch {
      toast({ title: '获取角色列表失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [current, pageSize, searchKeyword, toast])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  const openCreateDialog = () => {
    setDialogTitle('创建角色')
    setFormData(initialFormData)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEditDialog = async (id: number) => {
    setDialogTitle('编辑角色')
    setEditingId(id)
    setFormLoading(true)
    setDialogOpen(true)
    try {
      const res = await rolesApi.getRoleDetail(id)
      if (res.code === 200 && res.data) {
        setFormData({
          name: res.data.name || '', code: res.data.code || '',
          description: res.data.description || '', status: res.data.status ?? 1,
        })
      }
    } catch {
      toast({ title: '获取角色详情失败', variant: 'destructive' })
      setDialogOpen(false)
    } finally {
      setFormLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name) { toast({ title: '请填写角色名称', variant: 'destructive' }); return }
    if (!formData.code && !editingId) { toast({ title: '请填写角色编码', variant: 'destructive' }); return }

    setFormLoading(true)
    try {
      const res = editingId
        ? await rolesApi.updateRole(editingId, { name: formData.name, description: formData.description, status: formData.status })
        : await rolesApi.createRole({ name: formData.name, code: formData.code, description: formData.description, status: formData.status })

      if (res.code === 200) {
        toast({ title: editingId ? '更新角色成功' : '创建角色成功' })
        setDialogOpen(false)
        fetchRoles()
      } else {
        toast({ title: '操作失败', description: res.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setDeletingLoading(true)
    try {
      const res = await rolesApi.deleteRole(deletingId)
      if (res.code === 200) {
        toast({ title: '删除角色成功' })
        setDeleteDialogOpen(false)
        fetchRoles()
      } else {
        toast({ title: '删除角色失败', description: res.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    } finally {
      setDeletingLoading(false)
    }
  }

  const openPermDialog = (role: RoleBaseVO) => {
    setPermRoleId(role.id ?? null)
    setPermRoleName(role.name ?? '')
    setPermDialogOpen(true)
  }

  const openMenuDialog = (role: RoleBaseVO) => {
    setMenuRoleId(role.id ?? null)
    setMenuRoleName(role.name ?? '')
    setMenuDialogOpen(true)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">角色管理</h1>
          <p className="text-muted-foreground mt-1">管理系统角色及权限配置</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />创建角色
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">角色列表</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索角色..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchRoles()} className="pl-9 h-9" />
              </div>
              <Button variant="outline" size="sm" onClick={fetchRoles} disabled={loading}>
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
                  <TableHead className="text-center">角色名称</TableHead>
                  <TableHead className="text-center">角色编码</TableHead>
                  <TableHead className="text-center">描述</TableHead>
                  <TableHead className="w-20 text-center">状态</TableHead>
                  <TableHead className="w-24 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="p-0"><TableSkeleton rows={5} cols={6} /></TableCell></TableRow>
                ) : roles.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : roles.map((role, i) => (
                  <TableRow key={role.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <TableCell className="text-center font-mono text-sm py-3">{role.id}</TableCell>
                    <TableCell className="text-center font-medium py-3">{role.name}</TableCell>
                    <TableCell className="text-center font-mono text-sm py-3">{role.code}</TableCell>
                    <TableCell className="text-center py-3">{role.description || '-'}</TableCell>
                    <TableCell className="text-center py-3">
                      {role.status === 1
                        ? <Badge variant="default" className="bg-emerald-500 text-xs">正常</Badge>
                        : <Badge variant="destructive" className="text-xs">禁用</Badge>}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="分配权限" onClick={() => openPermDialog(role)}><Shield className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="分配菜单" onClick={() => openMenuDialog(role)}><Menu className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => role.id && openEditDialog(role.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingId(role.id ?? null); setDeleteDialogOpen(true) }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </div>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{editingId ? '修改角色信息' : '填写角色信息创建新角色'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">角色名称 <span className="text-destructive">*</span></Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="请输入角色名称" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="code">角色编码 <span className="text-destructive">*</span></Label>
              <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} disabled={!!editingId} placeholder="请输入角色编码" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="请输入角色描述" />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="status">启用状态</Label>
              <Switch id="status" checked={formData.status === 1} onCheckedChange={(c) => setFormData({ ...formData, status: c ? 1 : 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={formLoading}>{formLoading ? '提交中...' : editingId ? '保存' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle><DialogDescription>删除后无法恢复，确定要删除该角色吗？</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingLoading}>{deletingLoading ? '删除中...' : '确认删除'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RolePermissionDialog open={permDialogOpen} onOpenChange={setPermDialogOpen} roleId={permRoleId} roleName={permRoleName} onSaved={fetchRoles} />
      <RoleMenuDialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen} roleId={menuRoleId} roleName={menuRoleName} onSaved={fetchRoles} />
    </div>
  )
}
