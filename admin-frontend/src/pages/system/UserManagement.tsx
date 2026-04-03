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
import { Plus, Search, Pencil, Trash2, RefreshCw, UserCog, Shield, Eye } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { getAdminUsers } from '@/api/generated/admin-users/admin-users'
import { getAdminUsersPermission } from '@/api/generated/admin-users-permission/admin-users-permission'
import { getRoles } from '@/api/generated/roles/roles'
import type { AdminUserVO, RoleBaseVO } from '@/api/generated/model'
import UserPermissionDialog from './components/UserPermissionDialog'
import UserDetailDialog from './components/UserDetailDialog'
import { TableSkeleton, DialogGroupSkeleton } from '@/components/skeletons'

const usersApi = getAdminUsers()
const permApi = getAdminUsersPermission()
const rolesApi = getRoles()

interface UserFormData {
  username: string
  password: string
  nickname: string
  email: string
  phone: string
  avatar: string
  isSuperuser: number
  status: number
}

const initialFormData: UserFormData = {
  username: '', password: '', nickname: '', email: '', phone: '', avatar: '', isSuperuser: 0, status: 1,
}

export default function UserManagement() {
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUserVO[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchKeyword, setSearchKeyword] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTitle, setDialogTitle] = useState('创建用户')
  const [formData, setFormData] = useState<UserFormData>(initialFormData)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)

  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [currentUsername, setCurrentUsername] = useState('')
  const [allRoles, setAllRoles] = useState<RoleBaseVO[]>([])
  const [userRoleIds, setUserRoleIds] = useState<Set<number>>(new Set())
  const [roleLoading, setRoleLoading] = useState(false)

  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [permUserId, setPermUserId] = useState<number | null>(null)
  const [permUsername, setPermUsername] = useState('')

  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailUserId, setDetailUserId] = useState<number | null>(null)
  const [detailUsername, setDetailUsername] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await usersApi.listUsers({ pageNum: current, pageSize, keyword: searchKeyword || undefined })
      if (res.code === 200 && res.data) {
        setUsers(res.data.records || [])
        setTotal(res.data.total || 0)
        setCurrent(res.data.current || 1)
        setPageSize(res.data.size || 10)
      }
    } catch {
      toast({ title: '获取用户列表失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [current, pageSize, searchKeyword, toast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openCreateDialog = () => {
    setDialogTitle('创建用户'); setFormData(initialFormData); setEditingId(null); setDialogOpen(true)
  }

  const openEditDialog = async (id: number) => {
    setDialogTitle('编辑用户'); setEditingId(id); setFormLoading(true); setDialogOpen(true)
    try {
      const res = await usersApi.getUserDetail(id)
      if (res.code === 200 && res.data) {
        setFormData({
          username: res.data.username || '', password: '',
          nickname: res.data.nickname || '', email: res.data.email || '',
          phone: res.data.phone || '', avatar: res.data.avatar || '',
          isSuperuser: res.data.isSuperuser ?? 0, status: res.data.status ?? 1,
        })
      }
    } catch {
      toast({ title: '获取用户详情失败', variant: 'destructive' }); setDialogOpen(false)
    } finally {
      setFormLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.username && !editingId) { toast({ title: '请填写用户名', variant: 'destructive' }); return }
    if (!editingId && !formData.password) { toast({ title: '请填写密码', variant: 'destructive' }); return }

    setFormLoading(true)
    try {
      if (editingId) {
        const updateData: Record<string, any> = {}
        if (formData.nickname) updateData.nickname = formData.nickname
        if (formData.email) updateData.email = formData.email
        if (formData.phone) updateData.phone = formData.phone
        if (formData.avatar) updateData.avatar = formData.avatar
        if (formData.isSuperuser !== undefined) updateData.isSuperuser = formData.isSuperuser
        if (formData.status !== undefined) updateData.status = formData.status
        if (formData.password) updateData.password = formData.password

        const res = await usersApi.updateUser(editingId, updateData)
        if (res.code === 200) { toast({ title: '更新用户成功' }); setDialogOpen(false); fetchUsers() }
        else toast({ title: '更新失败', description: res.message, variant: 'destructive' })
      } else {
        const res = await usersApi.createUser({
          username: formData.username, password: formData.password,
          nickname: formData.nickname || undefined, email: formData.email || undefined,
          phone: formData.phone || undefined, isSuperuser: formData.isSuperuser, status: formData.status,
        })
        if (res.code === 200) { toast({ title: '创建用户成功' }); setDialogOpen(false); fetchUsers() }
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
    setDeletingLoading(true)
    try {
      const res = await usersApi.deleteUser(deletingId)
      if (res.code === 200) { toast({ title: '删除用户成功' }); setDeleteDialogOpen(false); fetchUsers() }
      else toast({ title: '删除失败', description: res.message, variant: 'destructive' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    } finally {
      setDeletingLoading(false)
    }
  }

  const openRoleDialog = async (user: AdminUserVO) => {
    if (!user.id) return
    setCurrentUserId(user.id); setCurrentUsername(user.username ?? ''); setRoleDialogOpen(true); setRoleLoading(true)
    try {
      const [rolesRes, userRolesRes] = await Promise.all([
        rolesApi.listRoles({ pageNum: 1, pageSize: 100 }),
        permApi.getUserRoles(user.id),
      ])
      if (rolesRes.code === 200 && rolesRes.data) setAllRoles(rolesRes.data.records || [])
      if (userRolesRes.code === 200 && userRolesRes.data) {
        const ids = userRolesRes.data.map((r: RoleBaseVO) => r.id).filter((id): id is number => id != null)
        setUserRoleIds(new Set(ids))
      }
    } catch {
      toast({ title: '获取角色信息失败', variant: 'destructive' })
    } finally {
      setRoleLoading(false)
    }
  }

  const toggleRole = (roleId: number) => {
    setUserRoleIds(prev => {
      const next = new Set(prev)
      if (next.has(roleId)) next.delete(roleId); else next.add(roleId)
      return next
    })
  }

  const saveRoles = async () => {
    if (!currentUserId) return
    setRoleLoading(true)
    try {
      const res = await permApi.syncUserRoles(currentUserId, { roleIds: Array.from(userRoleIds) })
      if (res.code === 200) { toast({ title: '角色分配成功' }); setRoleDialogOpen(false) }
      else toast({ title: '分配失败', description: res.message, variant: 'destructive' })
    } catch {
      toast({ title: '角色分配失败', variant: 'destructive' })
    } finally {
      setRoleLoading(false)
    }
  }

  const openPermDialog = (user: AdminUserVO) => {
    setPermUserId(user.id ?? null); setPermUsername(user.username ?? ''); setPermDialogOpen(true)
  }

  const openDetailDialog = (user: AdminUserVO) => {
    setDetailUserId(user.id ?? null); setDetailUsername(user.username ?? ''); setDetailDialogOpen(true)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
          <p className="text-muted-foreground mt-1">管理系统用户账户</p>
        </div>
        <Button onClick={openCreateDialog}><Plus className="w-4 h-4 mr-2" />创建用户</Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">用户列表</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="搜索用户..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchUsers()} className="pl-9 h-9" />
              </div>
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
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
                  <TableHead className="text-center">昵称</TableHead>
                  <TableHead className="text-center">邮箱</TableHead>
                  <TableHead className="text-center">手机号</TableHead>
                  <TableHead className="w-24 text-center">超级管理员</TableHead>
                  <TableHead className="w-20 text-center">状态</TableHead>
                  <TableHead className="w-32 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="p-0"><TableSkeleton rows={5} cols={8} /></TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : users.map((user, i) => (
                  <TableRow key={user.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <TableCell className="text-center font-mono text-sm py-3">{user.id}</TableCell>
                    <TableCell className="text-center font-medium py-3">{user.username}</TableCell>
                    <TableCell className="text-center py-3">{user.nickname || '-'}</TableCell>
                    <TableCell className="text-center py-3">{user.email || '-'}</TableCell>
                    <TableCell className="text-center py-3">{user.phone || '-'}</TableCell>
                    <TableCell className="text-center py-3">
                      {user.isSuperuser === 1 ? <Badge variant="default" className="text-xs">是</Badge> : <Badge variant="secondary" className="text-xs">否</Badge>}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      {user.status === 1 ? <Badge variant="default" className="bg-emerald-500 text-xs">正常</Badge> : <Badge variant="destructive" className="text-xs">禁用</Badge>}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="分配角色" onClick={() => openRoleDialog(user)}><UserCog className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="用户详情" onClick={() => openDetailDialog(user)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="权限管理" onClick={() => openPermDialog(user)}><Shield className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => user.id && openEditDialog(user.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingId(user.id ?? null); setDeleteDialogOpen(true) }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle><DialogDescription>{editingId ? '修改用户信息' : '填写用户信息创建新账户'}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="username">用户名 <span className="text-destructive">*</span></Label><Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} disabled={!!editingId} placeholder="请输入用户名" /></div>
            <div className="grid gap-2"><Label htmlFor="password">{editingId ? '密码（留空则不修改）' : '密码'}</Label><Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={editingId ? '留空则不修改密码' : '请输入密码'} /></div>
            <div className="grid gap-2"><Label htmlFor="nickname">昵称</Label><Input id="nickname" value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} placeholder="请输入昵称" /></div>
            <div className="grid gap-2"><Label htmlFor="email">邮箱</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="请输入邮箱" /></div>
            <div className="grid gap-2"><Label htmlFor="phone">手机号</Label><Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="请输入手机号" /></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Label htmlFor="isSuperuser">超级管理员</Label><Switch id="isSuperuser" checked={formData.isSuperuser === 1} onCheckedChange={(c) => setFormData({ ...formData, isSuperuser: c ? 1 : 0 })} /></div>
              <div className="flex items-center gap-2"><Label htmlFor="status">启用状态</Label><Switch id="status" checked={formData.status === 1} onCheckedChange={(c) => setFormData({ ...formData, status: c ? 1 : 0 })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={formLoading}>{formLoading ? '提交中...' : editingId ? '保存' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>确认删除</DialogTitle><DialogDescription>删除后无法恢复，确定要删除该用户吗？</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button><Button variant="destructive" onClick={handleDelete} disabled={deletingLoading}>{deletingLoading ? '删除中...' : '确认删除'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>分配角色 - {currentUsername}</DialogTitle><DialogDescription>勾选该用户拥有的角色</DialogDescription></DialogHeader>
          {roleLoading ? (
            <DialogGroupSkeleton groups={2} itemsPerGroup={3} />
          ) : (
            <div className="py-4 max-h-80 overflow-y-auto space-y-2">
              {allRoles.map(role => (
                <div key={role.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                  <Checkbox checked={userRoleIds.has(role.id!)} onCheckedChange={() => role.id && toggleRole(role.id)} />
                  <div className="flex-1"><div className="font-medium text-sm">{role.name}</div><div className="text-xs text-muted-foreground">{role.code}</div></div>
                  {role.status === 1 ? <Badge variant="default" className="bg-emerald-500 text-xs">正常</Badge> : <Badge variant="secondary" className="text-xs">禁用</Badge>}
                </div>
              ))}
              {allRoles.length === 0 && <div className="text-center py-8 text-muted-foreground">暂无可分配的角色</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>取消</Button>
            <Button onClick={saveRoles} disabled={roleLoading}>{roleLoading ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserPermissionDialog open={permDialogOpen} onOpenChange={setPermDialogOpen} userId={permUserId} username={permUsername} />
      <UserDetailDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} userId={detailUserId} username={detailUsername} />
    </div>
  )
}
