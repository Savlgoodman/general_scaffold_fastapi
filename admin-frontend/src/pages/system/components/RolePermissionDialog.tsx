import { useState, useEffect, useCallback } from 'react'
import { DialogGroupSkeleton } from '@/components/skeletons'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { ChevronDown, ChevronRight, FolderOpen } from 'lucide-react'
import { getRoles } from '@/api/generated/roles/roles'
import type { RolePermissionFullVO, GroupSection } from '@/api/generated/model'

const rolesApi = getRoles()

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: number | null
  roleName: string
  onSaved?: () => void
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

export default function RolePermissionDialog({ open, onOpenChange, roleId, roleName, onSaved }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<RolePermissionFullVO | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    if (!roleId) return
    setLoading(true)
    try {
      const res = await rolesApi.getRolePermissions(roleId)
      if (res.code === 200 && res.data) {
        setData(res.data)
        const assigned = new Set<number>()
        res.data.groups?.forEach(group => {
          if (group.groupPermission?.assigned && group.groupPermission.id) assigned.add(group.groupPermission.id)
          group.children?.forEach(child => { if (child.assigned && child.id) assigned.add(child.id) })
        })
        setSelectedIds(assigned)
        setExpandedGroups(new Set(res.data.groups?.map(g => g.groupKey!).filter(Boolean) || []))
      }
    } catch {
      toast({ title: '获取权限信息失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [roleId, toast])

  useEffect(() => { if (open && roleId) fetchData() }, [open, roleId, fetchData])

  const isGroupGranted = (group: GroupSection): boolean =>
    group.groupPermission?.id != null && selectedIds.has(group.groupPermission.id)

  const toggleGroup = (group: GroupSection) => {
    const gpId = group.groupPermission?.id
    if (gpId == null) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(gpId)) next.delete(gpId); else next.add(gpId)
      return next
    })
  }

  const toggleChild = (childId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(childId)) next.delete(childId); else next.add(childId)
      return next
    })
  }

  const toggleExpand = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey)
      return next
    })
  }

  const handleSave = async () => {
    if (!roleId) return
    setSaving(true)
    try {
      const permissions = Array.from(selectedIds).map(id => ({ permissionId: id, effect: 'GRANT' }))
      const res = await rolesApi.syncRolePermissions(roleId, { permissions })
      if (res.code === 200) {
        toast({ title: '权限分配成功' }); onOpenChange(false); onSaved?.()
      } else {
        toast({ title: '权限分配失败', description: res.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '权限分配失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>分配权限 - {roleName}</DialogTitle>
          <DialogDescription>已选 {selectedIds.size}/{data?.summary?.totalPermissions || 0} 个权限。组权限勾选后，子权限自动覆盖。</DialogDescription>
        </DialogHeader>
        {loading ? (
          <DialogGroupSkeleton groups={4} itemsPerGroup={4} />
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {data?.groups?.map(group => {
              const expanded = expandedGroups.has(group.groupKey!)
              const groupGranted = isGroupGranted(group)
              const gp = group.groupPermission
              return (
                <div key={group.groupKey} className="border rounded-lg">
                  {/* 组头 */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/30">
                    <button onClick={() => toggleExpand(group.groupKey!)} className="p-0.5 hover:bg-muted rounded shrink-0">
                      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {gp && <Checkbox checked={groupGranted} onCheckedChange={() => toggleGroup(group)} className="h-4 w-4 shrink-0" />}
                    <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-sm truncate">{group.groupName}</span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">{group.assignedCount}/{group.totalCount}</span>
                    {groupGranted && <Badge className="bg-emerald-500 text-[11px] shrink-0">组已授权</Badge>}
                  </div>
                  {/* 子权限 */}
                  {expanded && (
                    <div className="px-3 pb-2.5 pt-1 space-y-0.5">
                      {group.children?.map(child => {
                        const covered = groupGranted
                        const checked = covered || selectedIds.has(child.id!)
                        return (
                          <div key={child.id} className="flex items-center gap-2 py-1.5 pl-8 rounded-md hover:bg-muted/30">
                            <Checkbox checked={checked} disabled={covered} onCheckedChange={() => child.id && toggleChild(child.id)} className="h-4 w-4 shrink-0" />
                            <MethodTag method={child.method} />
                            <span className="text-sm truncate min-w-0 flex-1">{child.name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">{child.path}</span>
                            {covered && <Badge variant="outline" className="text-[11px] shrink-0 text-emerald-600 border-emerald-300">组覆盖</Badge>}
                          </div>
                        )
                      })}
                      {(!group.children || group.children.length === 0) && <div className="text-sm text-muted-foreground pl-8 py-2">无子权限</div>}
                    </div>
                  )}
                </div>
              )
            })}
            {(!data?.groups || data.groups.length === 0) && <div className="text-center py-8 text-muted-foreground">暂无权限数据</div>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || loading}>{saving ? '保存中...' : '保存'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
