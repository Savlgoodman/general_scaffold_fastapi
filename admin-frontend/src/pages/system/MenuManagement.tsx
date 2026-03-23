import { useState, useEffect, useCallback } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Plus, Pencil, Trash2, RefreshCw, ChevronRight, ChevronDown,
  LayoutDashboard, Users, Shield, Menu, Key, FileText, LogIn,
  AlertCircle, Settings, Globe, Home, Database, Bell, BookOpen, Folder,
  type LucideIcon,
} from 'lucide-react'
import { getMenus } from '@/api/generated/menus/menus'
import type { MenuVO } from '@/api/generated/model'

const menusApi = getMenus()

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, Users, Shield, Menu, Key, FileText, LogIn,
  AlertCircle, Settings, Globe, Home, Database, Bell, BookOpen, Folder,
}

const iconOptions = Object.keys(iconMap)

function getIcon(iconName?: string): LucideIcon {
  if (!iconName) return Folder
  return iconMap[iconName] ?? Folder
}

interface MenuFormData {
  name: string
  path: string
  icon: string
  component: string
  parentId: number
  type: string
  sort: number
}

const initialFormData: MenuFormData = {
  name: '', path: '', icon: '', component: '', parentId: 0, type: 'menu', sort: 0,
}

export default function MenuManagement() {
  const { toast } = useToast()
  const [menuTree, setMenuTree] = useState<MenuVO[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTitle, setDialogTitle] = useState('创建菜单')
  const [formData, setFormData] = useState<MenuFormData>(initialFormData)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)

  const fetchMenuTree = useCallback(async () => {
    setLoading(true)
    try {
      const res = await menusApi.getMenuTree()
      if (res.code === 200 && res.data) {
        setMenuTree(res.data)
        // 默认展开所有目录
        const ids = new Set<number>()
        function walk(items: MenuVO[]) {
          for (const item of items) {
            if (item.type === 'directory' && item.id) ids.add(item.id)
            if (item.children?.length) walk(item.children)
          }
        }
        walk(res.data)
        setExpandedIds(ids)
      }
    } catch {
      toast({ title: '获取菜单失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchMenuTree() }, [fetchMenuTree])

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** 获取可见的扁平菜单列表（根据展开状态过滤） */
  function getVisibleRows(menus: MenuVO[], level = 0): Array<MenuVO & { _level: number }> {
    const result: Array<MenuVO & { _level: number }> = []
    for (const menu of menus) {
      result.push({ ...menu, _level: level })
      if (menu.children?.length && menu.id && expandedIds.has(menu.id)) {
        result.push(...getVisibleRows(menu.children, level + 1))
      }
    }
    return result
  }

  /** 构建父级选择列表 */
  function getParentOptions(): Array<{ id: number; name: string; level: number }> {
    const options: Array<{ id: number; name: string; level: number }> = [
      { id: 0, name: '顶级菜单', level: 0 },
    ]
    function walk(items: MenuVO[], level: number) {
      for (const item of items) {
        if (item.type === 'directory' && item.id) {
          options.push({ id: item.id, name: item.name ?? '', level })
          if (item.children?.length) walk(item.children, level + 1)
        }
      }
    }
    walk(menuTree, 1)
    return options
  }

  const openCreateDialog = (parentId = 0) => {
    setDialogTitle('创建菜单')
    setFormData({ ...initialFormData, parentId })
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEditDialog = (menu: MenuVO) => {
    setDialogTitle('编辑菜单')
    setFormData({
      name: menu.name ?? '',
      path: menu.path ?? '',
      icon: menu.icon ?? '',
      component: menu.component ?? '',
      parentId: menu.parentId ?? 0,
      type: menu.type ?? 'menu',
      sort: menu.sort ?? 0,
    })
    setEditingId(menu.id ?? null)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: '请输入菜单名称', variant: 'destructive' })
      return
    }
    setFormLoading(true)
    try {
      if (editingId) {
        const res = await menusApi.updateMenu(editingId, formData)
        if (res.code === 200) {
          toast({ title: '更新成功' })
          setDialogOpen(false)
          fetchMenuTree()
        } else {
          toast({ title: res.message || '更新失败', variant: 'destructive' })
        }
      } else {
        const res = await menusApi.createMenu(formData)
        if (res.code === 200) {
          toast({ title: '创建成功' })
          setDialogOpen(false)
          fetchMenuTree()
        } else {
          toast({ title: res.message || '创建失败', variant: 'destructive' })
        }
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
      const res = await menusApi.deleteMenu(deletingId)
      if (res.code === 200) {
        toast({ title: '删除成功' })
        setDeleteDialogOpen(false)
        fetchMenuTree()
      } else {
        toast({ title: res.message || '删除失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    } finally {
      setDeletingLoading(false)
    }
  }

  const visibleRows = getVisibleRows(menuTree)

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold">菜单管理</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchMenuTree} disabled={loading}>
              <RefreshCw className={`size-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button size="sm" onClick={() => openCreateDialog()}>
              <Plus className="size-4 mr-1" />
              新建菜单
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">菜单名称</TableHead>
                <TableHead>图标</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>路由路径</TableHead>
                <TableHead className="w-[80px]">排序</TableHead>
                <TableHead className="text-right w-[150px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {loading ? '加载中...' : '暂无菜单数据'}
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => {
                  const Icon = getIcon(row.icon)
                  const hasChildren = !!(row.children?.length)
                  const isExpanded = row.id ? expandedIds.has(row.id) : false

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div
                          className="flex items-center gap-1"
                          style={{ paddingLeft: `${row._level * 24}px` }}
                        >
                          {hasChildren ? (
                            <button
                              onClick={() => row.id && toggleExpand(row.id)}
                              className="p-0.5 hover:bg-accent rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronRight className="size-4" />
                              )}
                            </button>
                          ) : (
                            <span className="w-5" />
                          )}
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="ml-1">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">{row.icon || '-'}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.type === 'directory' ? 'secondary' : 'outline'}>
                          {row.type === 'directory' ? '目录' : row.type === 'menu' ? '菜单' : '按钮'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{row.path || '-'}</code>
                      </TableCell>
                      <TableCell>{row.sort}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {row.type === 'directory' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openCreateDialog(row.id ?? 0)}
                              title="添加子菜单"
                            >
                              <Plus className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(row)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingId(row.id ?? null)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 创建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              {editingId ? '修改菜单信息' : '创建新的菜单项'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">菜单名称</Label>
              <Input
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：用户管理"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">菜单类型</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="directory">目录</SelectItem>
                  <SelectItem value="menu">菜单</SelectItem>
                  <SelectItem value="button">按钮</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">父级菜单</Label>
              <Select
                value={String(formData.parentId)}
                onValueChange={(value) => setFormData({ ...formData, parentId: Number(value) })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getParentOptions().map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.id)}>
                      {'　'.repeat(opt.level)}{opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">路由路径</Label>
              <Input
                className="col-span-3"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="如：/system/user"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">图标</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择图标" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((name) => {
                    const Ic = iconMap[name]
                    return (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2">
                          <Ic className="size-4" />
                          {name}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">组件路径</Label>
              <Input
                className="col-span-3"
                value={formData.component}
                onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                placeholder="如：system/UserManagement"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">排序</Label>
              <Input
                className="col-span-3"
                type="number"
                value={formData.sort}
                onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={formLoading}>
              {formLoading ? '提交中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除菜单将同时删除其所有子菜单，此操作不可恢复。确认删除？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingLoading}>
              {deletingLoading ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
