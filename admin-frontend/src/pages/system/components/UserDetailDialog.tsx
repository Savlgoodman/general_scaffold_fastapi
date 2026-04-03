import { useState, useEffect, useCallback } from 'react'
import { DialogGroupSkeleton } from '@/components/skeletons'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  ChevronDown, ChevronRight, FolderOpen, CircleCheck, CircleX, CircleMinus,
} from 'lucide-react'
import { getIcon } from '@/lib/icon-map'
import { getAdminUsersPermission } from '@/api/generated/admin-users-permission/admin-users-permission'
import type {
  UserMenuOverviewVO, UserMenuOverviewVOGroup, UserMenuOverviewVOItem,
  UserPermissionOverviewVO, UserPermGroupSection, PermissionRow,
} from '@/api/generated/model'

const permApi = getAdminUsersPermission()

// getIcon 从 @/lib/icon-map 导入

const SOURCE_LABELS: Record<string, { label: string; cls: string }> = {
  SUPER_USER: { label: '超管', cls: 'bg-violet-500' },
  ROLE:       { label: '角色', cls: 'bg-sky-500' },
  DIRECTORY:  { label: '目录覆盖', cls: 'bg-amber-500' },
  OVERRIDE:   { label: '覆盖', cls: 'bg-orange-500' },
  NONE:       { label: '未分配', cls: 'bg-muted text-muted-foreground' },
}

const METHOD_STYLES: Record<string, string> = {
  GET:    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  POST:   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  PUT:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  '*':    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
}

function SourceBadge({ source, sourceRoles }: { source?: string; sourceRoles?: string[] }) {
  const s = SOURCE_LABELS[source ?? 'NONE'] ?? SOURCE_LABELS.NONE
  const roleText = sourceRoles?.length ? sourceRoles.join(', ') : undefined
  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <Badge className={`text-[11px] text-white ${s.cls}`}>{s.label}</Badge>
      {roleText && source === 'ROLE' && (
        <span className="text-[11px] text-muted-foreground">{roleText}</span>
      )}
    </span>
  )
}

function EffectDot({ effect }: { effect?: string | null }) {
  if (effect === 'GRANT') return <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />
  if (effect === 'DENY') return <CircleX className="w-4 h-4 text-rose-500 shrink-0" />
  return <CircleMinus className="w-4 h-4 text-muted-foreground/40 shrink-0" />
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number | null
  username: string
}

export default function UserDetailDialog({ open, onOpenChange, userId, username }: Props) {
  const { toast } = useToast()
  const [menuData, setMenuData] = useState<UserMenuOverviewVO | null>(null)
  const [permData, setPermData] = useState<UserPermissionOverviewVO | null>(null)
  const [loading, setLoading] = useState(false)
  const [menuExpanded, setMenuExpanded] = useState<Set<number>>(new Set())
  const [permExpanded, setPermExpanded] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [menuRes, permRes] = await Promise.all([
        permApi.getUserMenuOverview(userId),
        permApi.getUserPermissions(userId),
      ])
      if (menuRes.code === 200 && menuRes.data) {
        setMenuData(menuRes.data)
        setMenuExpanded(new Set(
          menuRes.data.groups?.filter(g => g.type === 'directory' && (g.children?.length ?? 0) > 0).map(g => g.id!).filter(Boolean) ?? []
        ))
      }
      if (permRes.code === 200 && permRes.data) {
        setPermData(permRes.data)
        setPermExpanded(new Set(permRes.data.groups?.map(g => g.groupKey!).filter(Boolean) ?? []))
      }
    } catch {
      toast({ title: '获取用户详情失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  useEffect(() => { if (open && userId) fetchData() }, [open, userId, fetchData])

  const toggleMenuExpand = (id: number) => {
    setMenuExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const togglePermExpand = (key: string) => {
    setPermExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>用户详情 - {username}</DialogTitle>
          {/* 角色列表 + 超管标识 */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {(menuData?.superuser || permData?.superuser) && (
              <Badge className="bg-violet-500 text-white text-xs">超级管理员</Badge>
            )}
            {(menuData?.roles ?? permData?.roles)?.map(r => (
              <Badge key={r.id} variant="outline" className="text-xs">{r.name}</Badge>
            ))}
            {!(menuData?.roles?.length || permData?.roles?.length) && !menuData?.superuser && (
              <span className="text-xs text-muted-foreground">未分配角色</span>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <DialogGroupSkeleton groups={3} itemsPerGroup={3} />
        ) : (
          <Tabs defaultValue="menus" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="menus">
                菜单权限
                {menuData?.summary && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {menuData.summary.grantedCount}/{menuData.summary.totalMenus}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="permissions">
                API权限
                {permData?.summary && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {permData.summary.grantedCount}/{permData.summary.totalPermissions}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 菜单权限 Tab */}
            <TabsContent value="menus" className="flex-1 overflow-y-auto space-y-2 mt-2">
              {menuData?.groups?.map(group => (
                <MenuGroupCard
                  key={group.id}
                  group={group}
                  expanded={group.id ? menuExpanded.has(group.id) : false}
                  onToggle={() => group.id && toggleMenuExpand(group.id)}
                />
              ))}
              {(!menuData?.groups || menuData.groups.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">暂无菜单数据</div>
              )}
            </TabsContent>

            {/* API权限 Tab */}
            <TabsContent value="permissions" className="flex-1 overflow-y-auto space-y-2 mt-2">
              {permData?.groups?.map(group => (
                <PermGroupCard
                  key={group.groupKey}
                  group={group}
                  expanded={permExpanded.has(group.groupKey!)}
                  onToggle={() => group.groupKey && togglePermExpand(group.groupKey)}
                />
              ))}
              {(!permData?.groups || permData.groups.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">暂无权限数据</div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ─── 菜单分组卡片 ─── */
function MenuGroupCard({ group, expanded, onToggle }: {
  group: UserMenuOverviewVOGroup; expanded: boolean; onToggle: () => void
}) {
  const isDirectory = group.type === 'directory'
  const hasChildren = (group.children?.length ?? 0) > 0
  const Icon = getIcon(group.icon)

  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/30">
        {isDirectory && hasChildren ? (
          <button onClick={onToggle} className="p-0.5 hover:bg-muted rounded shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : <span className="w-5 shrink-0" />}
        {group.granted
          ? <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          : <CircleMinus className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
        {isDirectory
          ? <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
          : <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
        <span className="font-medium text-sm truncate">{group.name}</span>
        <span className="text-xs text-muted-foreground truncate hidden sm:inline">{group.path}</span>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {isDirectory && hasChildren && (
            <span className="text-xs text-muted-foreground">{group.grantedCount}/{group.totalCount}</span>
          )}
          <SourceBadge source={group.source} sourceRoles={group.sourceRoles} />
        </div>
      </div>
      {isDirectory && expanded && (
        <div className="px-3 pb-2 pt-1 space-y-0.5">
          {group.children?.map(child => (
            <MenuItemRow key={child.id} item={child} />
          ))}
          {!hasChildren && <div className="text-sm text-muted-foreground pl-8 py-2">无子菜单</div>}
        </div>
      )}
    </div>
  )
}

function MenuItemRow({ item }: { item: UserMenuOverviewVOItem }) {
  const Icon = getIcon(item.icon)
  return (
    <div className="flex items-center gap-2 py-1.5 pl-8 rounded-md hover:bg-muted/30">
      {item.granted
        ? <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        : <CircleMinus className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
      <Icon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
      <span className="text-sm truncate min-w-0 flex-1">{item.name}</span>
      <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">{item.path}</span>
      <SourceBadge source={item.source} sourceRoles={item.sourceRoles} />
    </div>
  )
}

/* ─── API权限分组卡片 ─── */
function PermGroupCard({ group, expanded, onToggle }: {
  group: UserPermGroupSection; expanded: boolean; onToggle: () => void
}) {
  const children = group.children ?? []
  const grantedCount = children.filter(c => c.finalEffect === 'GRANT').length

  return (
    <div className="border rounded-lg">
      <button className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/30 w-full text-left" onClick={onToggle}>
        {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
        <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="font-medium text-sm truncate">{group.groupName}</span>
        <Badge variant="outline" className="text-xs font-mono shrink-0">{group.groupKey}</Badge>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">{grantedCount}/{children.length}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-2 pt-1 space-y-0.5">
          {children.map(row => (
            <PermRowItem key={row.permissionId} row={row} />
          ))}
          {children.length === 0 && <div className="text-sm text-muted-foreground pl-8 py-2">无权限项</div>}
        </div>
      )}
    </div>
  )
}

function PermRowItem({ row }: { row: PermissionRow }) {
  const m = row.method ?? '*'
  return (
    <div className="flex items-center gap-2 py-1.5 pl-8 rounded-md hover:bg-muted/30">
      <EffectDot effect={row.finalEffect} />
      <span className={`inline-flex items-center justify-center w-[52px] shrink-0 rounded px-1 py-0.5 text-[11px] font-semibold font-mono ${METHOD_STYLES[m] || METHOD_STYLES['*']}`}>
        {m}
      </span>
      <span className="text-sm truncate min-w-0 flex-1">{row.name}</span>
      <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">{row.path}</span>
      <SourceBadge source={row.source} sourceRoles={row.sourceRoles} />
    </div>
  )
}
