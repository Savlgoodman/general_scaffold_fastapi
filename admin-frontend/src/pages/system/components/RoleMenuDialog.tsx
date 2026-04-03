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
import { getIcon } from '@/lib/icon-map'
import { getRoles } from '@/api/generated/roles/roles'
import type { RoleMenuVO, RoleMenuVOGroup } from '@/api/generated/model'

const rolesApi = getRoles()

// getIcon 从 @/lib/icon-map 导入

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: number | null
  roleName: string
  onSaved?: () => void
}

export default function RoleMenuDialog({ open, onOpenChange, roleId, roleName, onSaved }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<RoleMenuVO | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  const fetchData = useCallback(async () => {
    if (!roleId) return
    setLoading(true)
    try {
      const res = await rolesApi.getRoleMenus(roleId)
      if (res.code === 200 && res.data) {
        setData(res.data)
        const assigned = new Set<number>()
        res.data.groups?.forEach(group => {
          if (group.assigned && group.id) assigned.add(group.id)
          group.children?.forEach(child => {
            if (child.assigned && child.id && !child.coveredByDirectory) assigned.add(child.id)
          })
        })
        setSelectedIds(assigned)
        // 默认展开有子菜单的目录
        setExpandedGroups(new Set(
          res.data.groups
            ?.filter(g => g.type === 'directory' && (g.children?.length ?? 0) > 0)
            .map(g => g.id!)
            .filter(Boolean) || []
        ))
      }
    } catch {
      toast({ title: '获取菜单信息失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [roleId, toast])

  useEffect(() => { if (open && roleId) fetchData() }, [open, roleId, fetchData])

  const isDirGranted = (group: RoleMenuVOGroup): boolean =>
    group.type === 'directory' && group.id != null && selectedIds.has(group.id)

  const toggleGroup = (group: RoleMenuVOGroup) => {
    if (group.id == null) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(group.id!)) {
        next.delete(group.id!)
        // 取消目录时，不自动取消子菜单（让用户自行选择）
      } else {
        next.add(group.id!)
      }
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

  const toggleExpand = (id: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (!roleId) return
    setSaving(true)
    try {
      const menuIds = Array.from(selectedIds)
      const res = await rolesApi.syncRoleMenus(roleId, { menuIds })
      if (res.code === 200) {
        toast({ title: '菜单分配成功' }); onOpenChange(false); onSaved?.()
      } else {
        toast({ title: '菜单分配失败', description: res.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '菜单分配失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // 计算已选总数（包含目录覆盖的子菜单）
  const totalSelected = (() => {
    let count = 0
    data?.groups?.forEach(group => {
      if (group.id && selectedIds.has(group.id)) {
        count++
        if (group.type === 'directory') {
          count += group.children?.length ?? 0
        }
      } else {
        group.children?.forEach(child => {
          if (child.id && selectedIds.has(child.id)) count++
        })
      }
    })
    return count
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>分配菜单 - {roleName}</DialogTitle>
          <DialogDescription>
            已选 {totalSelected}/{data?.summary?.totalMenus || 0} 个菜单。勾选目录后，其下所有子菜单自动覆盖。
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <DialogGroupSkeleton groups={3} itemsPerGroup={3} />
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {data?.groups?.map(group => {
              const isDirectory = group.type === 'directory'
              const hasChildren = (group.children?.length ?? 0) > 0
              const expanded = group.id ? expandedGroups.has(group.id) : false
              const dirGranted = isDirGranted(group)
              const GroupIcon = getIcon(group.icon)

              return (
                <div key={group.id} className="border rounded-lg">
                  {/* 组头 */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/30">
                    {isDirectory && hasChildren ? (
                      <button onClick={() => group.id && toggleExpand(group.id)} className="p-0.5 hover:bg-muted rounded shrink-0">
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" />
                    )}
                    <Checkbox
                      checked={group.id ? selectedIds.has(group.id) : false}
                      onCheckedChange={() => toggleGroup(group)}
                      className="h-4 w-4 shrink-0"
                    />
                    {isDirectory
                      ? <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                      : <GroupIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <span className="font-medium text-sm truncate">{group.name}</span>
                    <Badge variant={isDirectory ? 'secondary' : 'outline'} className="text-[11px] shrink-0">
                      {isDirectory ? '目录' : '菜单'}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">{group.path}</span>
                    {isDirectory && hasChildren && (
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {group.assignedCount}/{group.totalCount}
                      </span>
                    )}
                    {dirGranted && (
                      <Badge className="bg-emerald-500 text-[11px] shrink-0 ml-auto">目录已授权</Badge>
                    )}
                  </div>
                  {/* 子菜单 */}
                  {isDirectory && expanded && (
                    <div className="px-3 pb-2.5 pt-1 space-y-0.5">
                      {group.children?.map(child => {
                        const covered = dirGranted
                        const checked = covered || (child.id ? selectedIds.has(child.id) : false)
                        const ChildIcon = getIcon(child.icon)
                        return (
                          <div key={child.id} className="flex items-center gap-2 py-1.5 pl-8 rounded-md hover:bg-muted/30">
                            <Checkbox
                              checked={checked}
                              disabled={covered}
                              onCheckedChange={() => child.id && toggleChild(child.id)}
                              className="h-4 w-4 shrink-0"
                            />
                            <ChildIcon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                            <span className="text-sm truncate min-w-0 flex-1">{child.name}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:block">{child.path}</span>
                            {covered && (
                              <Badge variant="outline" className="text-[11px] shrink-0 text-emerald-600 border-emerald-300">
                                目录覆盖
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                      {(!group.children || group.children.length === 0) && (
                        <div className="text-sm text-muted-foreground pl-8 py-2">无子菜单</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {(!data?.groups || data.groups.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">暂无菜单数据</div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
