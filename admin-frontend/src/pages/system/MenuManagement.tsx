import { useState, useEffect, useCallback } from 'react'
import { CardGroupSkeleton } from '@/components/skeletons'
import { Card, CardContent } from '@/components/ui/card'
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
  FolderOpen, GripVertical,
} from 'lucide-react'
import { iconMap, iconOptions, getIcon } from '@/lib/icon-map'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getMenus } from '@/api/generated/menus/menus'
import type { MenuVO } from '@/api/generated/model'

const menusApi = getMenus()

// iconMap, iconOptions, getIcon 从 @/lib/icon-map 导入

const TYPE_LABELS: Record<string, string> = {
  directory: '目录', menu: '菜单', button: '按钮',
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

/* ─── Sortable 子菜单行 ─── */
function SortableMenuRow({
  item, onEdit, onDelete,
}: {
  item: MenuVO
  onEdit: (m: MenuVO) => void
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id!,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const Icon = getIcon(item.icon)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2.5 py-2 px-3 rounded-md transition-colors hover:bg-muted/50"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/40 hover:text-muted-foreground">
        <GripVertical className="w-4 h-4" />
      </button>
      <Icon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
      <Badge variant="outline" className="text-xs shrink-0">
        {TYPE_LABELS[item.type ?? 'menu']}
      </Badge>
      <span className="text-sm font-medium min-w-0 truncate">{item.name}</span>
      <span className="text-xs text-muted-foreground truncate hidden sm:inline">{item.path}</span>
      <div className="ml-auto flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-foreground mr-1">#{item.sort}</span>
        <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => onEdit(item)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive hover:text-destructive" onClick={() => onDelete(item.id!)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

/* ─── 主页面 ─── */
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const fetchMenuTree = useCallback(async () => {
    setLoading(true)
    try {
      const res = await menusApi.getMenuTree()
      if (res.code === 200 && res.data) {
        setMenuTree(res.data)
        const ids = new Set<number>()
        for (const item of res.data) {
          if (item.type === 'directory' && item.id) ids.add(item.id)
        }
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
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const expandAll = () => {
    const ids = new Set<number>()
    for (const item of menuTree) { if (item.id) ids.add(item.id) }
    setExpandedIds(ids)
  }
  const collapseAll = () => setExpandedIds(new Set())

  /* ─── 拖动排序 ─── */
  const handleDragEnd = async (parentId: number, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // 找到同级列表
    let siblings: MenuVO[]
    if (parentId === 0) {
      siblings = menuTree
    } else {
      siblings = menuTree.find(m => m.id === parentId)?.children ?? []
    }

    const oldIndex = siblings.findIndex(m => m.id === active.id)
    const newIndex = siblings.findIndex(m => m.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(siblings, oldIndex, newIndex)

    // 乐观更新 UI
    if (parentId === 0) {
      setMenuTree(reordered)
    } else {
      setMenuTree(prev => prev.map(m =>
        m.id === parentId ? { ...m, children: reordered } : m
      ))
    }

    // 保存到后端
    const items = reordered.map((m, i) => ({ id: m.id!, sort: i }))
    try {
      await menusApi.sortMenus({ items })
    } catch {
      toast({ title: '排序保存失败', variant: 'destructive' })
      fetchMenuTree()
    }
  }

  /* ─── 弹窗 ─── */
  function getParentOptions(): Array<{ id: number; name: string; level: number }> {
    const options: Array<{ id: number; name: string; level: number }> = [
      { id: 0, name: '顶级菜单', level: 0 },
    ]
    for (const item of menuTree) {
      if (item.type === 'directory' && item.id) {
        options.push({ id: item.id, name: item.name ?? '', level: 1 })
      }
    }
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
      name: menu.name ?? '', path: menu.path ?? '', icon: menu.icon ?? '',
      component: menu.component ?? '', parentId: menu.parentId ?? 0,
      type: menu.type ?? 'menu', sort: menu.sort ?? 0,
    })
    setEditingId(menu.id ?? null)
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: '请输入菜单名称', variant: 'destructive' }); return
    }
    setFormLoading(true)
    try {
      const res = editingId
        ? await menusApi.updateMenu(editingId, formData)
        : await menusApi.createMenu(formData)
      if (res.code === 200) {
        toast({ title: editingId ? '更新成功' : '创建成功' })
        setDialogOpen(false)
        fetchMenuTree()
      } else {
        toast({ title: res.message || '操作失败', variant: 'destructive' })
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

  const totalMenus = menuTree.reduce((sum, m) => sum + 1 + (m.children?.length || 0), 0)

  /* ─── 渲染 ── */
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">菜单管理</h1>
          <p className="text-muted-foreground mt-1">
            管理系统菜单结构 &mdash; {menuTree.length} 个分组，{totalMenus} 个菜单
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>全部展开</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>全部折叠</Button>
          <Button variant="outline" size="sm" onClick={fetchMenuTree} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />刷新
          </Button>
          <Button size="sm" onClick={() => openCreateDialog()}>
            <Plus className="w-4 h-4 mr-1.5" />新建菜单
          </Button>
        </div>
      </div>

      {/* 内容 */}
      {loading ? (
        <CardGroupSkeleton groups={3} itemsPerGroup={4} />
      ) : menuTree.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            暂无菜单数据
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(0, e)}>
          <SortableContext items={menuTree.map(m => m.id!)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {menuTree.map(item => {
                const isDirectory = item.type === 'directory'
                const children = item.children ?? []
                const expanded = item.id ? expandedIds.has(item.id) : false
                const Icon = getIcon(item.icon)

                return (
                  <SortableTopCard
                    key={item.id}
                    item={item}
                  >
                    {/* Card 头部 */}
                    <div className="flex items-center gap-3 w-full px-4 py-3">
                      <SortHandle id={item.id!} />
                      {isDirectory ? (
                        <button onClick={() => item.id && toggleExpand(item.id)} className="shrink-0">
                          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      ) : <span className="w-4" />}
                      {isDirectory
                        ? <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" />
                        : <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                      }
                      <span className="font-semibold">{item.name}</span>
                      <Badge variant={isDirectory ? 'secondary' : 'outline'} className="text-xs">
                        {TYPE_LABELS[item.type ?? 'menu']}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">{item.path}</span>
                      {isDirectory && (
                        <span className="text-xs text-muted-foreground">{children.length} 个子菜单</span>
                      )}
                      <div className="ml-auto flex items-center gap-1 shrink-0">
                        {isDirectory && (
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openCreateDialog(item.id ?? 0)}>
                            <Plus className="w-3.5 h-3.5 mr-1" />添加
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEditDialog(item)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => { setDeletingId(item.id ?? null); setDeleteDialogOpen(true) }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* 展开的子菜单 */}
                    {isDirectory && expanded && children.length > 0 && (
                      <div className="border-t px-2 py-1.5 space-y-0.5">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(item.id!, e)}>
                          <SortableContext items={children.map(c => c.id!)} strategy={verticalListSortingStrategy}>
                            {children.map(child => (
                              <SortableMenuRow
                                key={child.id}
                                item={child}
                                onEdit={openEditDialog}
                                onDelete={(id) => { setDeletingId(id); setDeleteDialogOpen(true) }}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                    )}
                    {isDirectory && expanded && children.length === 0 && (
                      <div className="border-t px-2 py-4 text-sm text-muted-foreground text-center">
                        该目录下暂无子菜单
                      </div>
                    )}
                  </SortableTopCard>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* 创建/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{editingId ? '修改菜单信息' : '创建新的菜单项'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">菜单名称</Label>
              <Input className="col-span-3" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="如：用户管理" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">菜单类型</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="directory">目录</SelectItem>
                  <SelectItem value="menu">菜单</SelectItem>
                  <SelectItem value="button">按钮</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">父级菜单</Label>
              <Select value={String(formData.parentId)} onValueChange={(v) => setFormData({ ...formData, parentId: Number(v) })}>
                <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getParentOptions().map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.id)}>{'　'.repeat(opt.level)}{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">路由路径</Label>
              <Input className="col-span-3" value={formData.path} onChange={(e) => setFormData({ ...formData, path: e.target.value })} placeholder="如：/system/user" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">图标</Label>
              <Select value={formData.icon} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="选择图标" /></SelectTrigger>
                <SelectContent>
                  {iconOptions.map((name) => {
                    const Ic = iconMap[name]
                    return <SelectItem key={name} value={name}><span className="flex items-center gap-2"><Ic className="size-4" />{name}</span></SelectItem>
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">组件路径</Label>
              <Input className="col-span-3" value={formData.component} onChange={(e) => setFormData({ ...formData, component: e.target.value })} placeholder="如：system/UserManagement" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">排序</Label>
              <Input className="col-span-3" type="number" value={formData.sort} onChange={(e) => setFormData({ ...formData, sort: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={formLoading}>{formLoading ? '提交中...' : '确定'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>删除菜单将同时删除其所有子菜单，此操作不可恢复。确认删除？</DialogDescription>
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

/* ─── 拖动手柄 ─── */
function SortHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/40 hover:text-muted-foreground shrink-0">
      <GripVertical className="w-4 h-4" />
    </button>
  )
}

/* ─── 顶级可排序 Card ─── */
function SortableTopCard({ item, children }: { item: MenuVO; children: React.ReactNode }) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id!,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      {children}
    </Card>
  )
}
