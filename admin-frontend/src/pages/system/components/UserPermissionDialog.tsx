import { useState, useEffect, useCallback } from 'react'
import { DialogGroupSkeleton } from '@/components/skeletons'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Check, X, ChevronDown, ChevronRight, Plus, Pencil, Trash2,
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { getAdminUsersPermission } from '@/api/generated/admin-users-permission/admin-users-permission'
import type { UserPermissionOverviewVO, PermissionRow } from '@/api/generated/model'

const permApi = getAdminUsersPermission()

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number | null
  username: string
}

const METHOD_STYLES: Record<string, string> = {
  GET:    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  POST:   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  PUT:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  '*':    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
}

const MethodTag = ({ method }: { method?: string }) => {
  const m = method || '*'
  return (
    <span className={`inline-flex items-center justify-center w-[52px] shrink-0 rounded px-1 py-0.5 text-[11px] font-semibold font-mono ${METHOD_STYLES[m] || METHOD_STYLES['*']}`}>
      {m}
    </span>
  )
}

const EffectDot = ({ effect }: { effect?: string | null }) => {
  if (effect === 'GRANT') return <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
  if (effect === 'DENY') return <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
  return <div className="w-2 h-2 rounded-full bg-muted-foreground/20 shrink-0" />
}

export default function UserPermissionDialog({ open, onOpenChange, userId, username }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<UserPermissionOverviewVO | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [editingPermId, setEditingPermId] = useState<number | null>(null)
  const [editingEffect, setEditingEffect] = useState<string>('GRANT')

  const fetchData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await permApi.getUserPermissions(userId)
      if (res.code === 200 && res.data) {
        setData(res.data)
        setExpandedGroups(new Set(res.data.groups?.map(g => g.groupKey!).filter(Boolean) || []))
      }
    } catch {
      toast({ title: '获取权限信息失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId, toast])

  useEffect(() => {
    if (open && userId) { fetchData(); setEditingPermId(null) }
  }, [open, userId, fetchData])

  const toggleExpand = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const startEdit = (permId: number, currentEffect?: string | null) => {
    setEditingPermId(permId)
    setEditingEffect(currentEffect || 'GRANT')
  }

  const saveOverride = async (permId: number) => {
    if (!userId) return
    try {
      const currentOverrides = (data?.overrides || [])
        .filter(o => o.permissionId !== permId)
        .map(o => ({ permissionId: o.permissionId!, effect: o.effect! }))
      currentOverrides.push({ permissionId: permId, effect: editingEffect })
      await permApi.syncUserOverrides(userId, { overrides: currentOverrides })
      toast({ title: '覆盖设置成功' })
      setEditingPermId(null)
      fetchData()
    } catch {
      toast({ title: '覆盖设置失败', variant: 'destructive' })
    }
  }

  const handleDeleteOverride = async (overrideId: number) => {
    if (!userId) return
    try {
      await permApi.removeUserPermissionOverride(userId, overrideId)
      toast({ title: '覆盖已删除' })
      fetchData()
    } catch {
      toast({ title: '删除覆盖失败', variant: 'destructive' })
    }
  }

  const renderSourceBadge = (row: PermissionRow) => {
    if (row.source === 'SUPER_USER') return <Badge className="bg-violet-500 text-[11px]">超管</Badge>
    if (row.source === 'OVERRIDE') return <Badge variant="destructive" className="text-[11px]">覆盖:{row.overrideEffect}</Badge>
    if (row.source === 'ROLE' && row.sourceRoles && row.sourceRoles.length > 0) {
      const fullText = `角色:${row.sourceRoles.join(', ')}`
      const display = fullText.length > 13 ? fullText.slice(0, 12) + '…' : fullText
      const needTip = fullText.length > 13
      const badge = <Badge variant="secondary" className="text-[11px] cursor-default">{display}</Badge>
      return (
        <div className="flex items-center gap-1">
          {needTip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">{badge}</span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">{fullText}</p></TooltipContent>
            </Tooltip>
          ) : badge}
          {row.coveredByGroup && <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-300">组覆盖</Badge>}
        </div>
      )
    }
    return <Badge variant="outline" className="text-[11px] text-muted-foreground">未分配</Badge>
  }

  const renderActions = (row: PermissionRow) => {
    if (data?.superuser) return null
    if (editingPermId === row.permissionId) {
      return (
        <div className="flex items-center gap-1">
          <Select value={editingEffect} onValueChange={setEditingEffect}>
            <SelectTrigger className="h-6 w-[72px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GRANT">GRANT</SelectItem>
              <SelectItem value="DENY">DENY</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => saveOverride(row.permissionId!)}><Check className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingPermId(null)}><X className="w-3 h-3" /></Button>
        </div>
      )
    }
    if (row.hasOverride) {
      return (
        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="编辑" onClick={() => startEdit(row.permissionId!, row.overrideEffect)}><Pencil className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" title="删除" onClick={() => row.overrideId && handleDeleteOverride(row.overrideId)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      )
    }
    return <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="添加覆盖" onClick={() => startEdit(row.permissionId!)}><Plus className="w-3 h-3" /></Button>
  }

  const summary = data?.summary

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
      <TooltipProvider delayDuration={200}>
        <DialogHeader>
          <DialogTitle>权限管理 - {username}</DialogTitle>
          <DialogDescription>查看用户权限来源，添加/编辑/删除覆盖</DialogDescription>
        </DialogHeader>
        {loading ? (
          <DialogGroupSkeleton groups={4} itemsPerGroup={4} />
        ) : data ? (
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* 角色 + 汇总 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">角色:</span>
              {data.roles?.map(r => <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>)}
              {data.superuser && <Badge className="bg-violet-500 text-xs">超级管理员</Badge>}
            </div>
            {summary && (
              <div className="flex gap-4 text-xs">
                <span>总计 <strong>{summary.totalPermissions}</strong></span>
                <span className="text-emerald-600">授权 <strong>{summary.grantedCount}</strong></span>
                <span className="text-red-600">拒绝 <strong>{summary.deniedCount}</strong></span>
                <span className="text-muted-foreground">未分配 <strong>{summary.unassignedCount}</strong></span>
                <span className="text-blue-600">覆盖 <strong>{summary.overrideCount}</strong></span>
              </div>
            )}

            {/* 分组权限列表 */}
            {data.groups?.map(group => {
              const expanded = expandedGroups.has(group.groupKey!)
              return (
                <div key={group.groupKey} className="border rounded-lg">
                  <button className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(group.groupKey!)}>
                    {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    <span className="font-medium text-sm">{group.groupName}</span>
                    <span className="text-xs text-muted-foreground">({group.children?.length || 0})</span>
                  </button>
                  {expanded && (
                    <div className="border-t px-2 pb-2 pt-1 space-y-0.5">
                      {group.children?.map(row => (
                        <div key={row.permissionId} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/20">
                          <div className="w-3 flex justify-center shrink-0">
                            <EffectDot effect={row.finalEffect} />
                          </div>
                          <MethodTag method={row.method} />
                          <span className="text-sm truncate min-w-0">{row.name}</span>
                          <div className="ml-auto flex items-center gap-1.5 shrink-0">
                            {renderSourceBadge(row)}
                            {renderActions(row)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* 覆盖记录 */}
            {data.overrides && data.overrides.length > 0 && (
              <div className="border rounded-lg p-3">
                <div className="font-medium text-sm mb-2">当前覆盖记录 ({data.overrides.length})</div>
                <div className="space-y-0.5">
                  {data.overrides.map(ov => (
                    <div key={ov.overrideId} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/20">
                      <div className="w-4 flex justify-center shrink-0">
                        <EffectDot effect={ov.effect} />
                      </div>
                      <MethodTag method={ov.method} />
                      <span className="text-sm truncate min-w-0 flex-1">{ov.permissionName}</span>
                      <Badge variant={ov.effect === 'GRANT' ? 'default' : 'destructive'} className="text-[11px] shrink-0">{ov.effect}</Badge>
                      <span className="text-[11px] text-muted-foreground shrink-0 w-[130px] text-right">{ov.createTime?.replace('T', ' ').slice(0, 19)}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive shrink-0" onClick={() => ov.overrideId && handleDeleteOverride(ov.overrideId)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button></DialogFooter>
      </TooltipProvider>
      </DialogContent>
    </Dialog>
  )
}
