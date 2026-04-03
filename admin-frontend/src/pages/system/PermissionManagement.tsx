import { useState, useEffect, useCallback, useMemo } from 'react'
import { CardGroupSkeleton } from '@/components/skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Search, RefreshCw, FolderOpen, FileText, ChevronDown, ChevronRight,
  Eye, CircleCheck, CircleX,
} from 'lucide-react'
import { getPermissions } from '@/api/generated/permissions/permissions'
import type { PermissionGroupVO, PermissionBaseVO } from '@/api/generated/model'

const permissionsApi = getPermissions()

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET:    { bg: 'bg-sky-100 dark:bg-sky-900/40',    text: 'text-sky-700 dark:text-sky-300' },
  POST:   { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300' },
  PUT:    { bg: 'bg-amber-100 dark:bg-amber-900/40',  text: 'text-amber-700 dark:text-amber-300' },
  DELETE: { bg: 'bg-rose-100 dark:bg-rose-900/40',   text: 'text-rose-700 dark:text-rose-300' },
  '*':    { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300' },
}

const MethodBadge = ({ method }: { method?: string }) => {
  const m = method || '*'
  const colors = METHOD_COLORS[m] || METHOD_COLORS['*']
  return (
    <span className={`inline-flex items-center justify-center w-16 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold font-mono ${colors.bg} ${colors.text}`}>
      {m}
    </span>
  )
}

export default function PermissionManagement() {
  const { toast } = useToast()
  const [groups, setGroups] = useState<PermissionGroupVO[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [detailPerm, setDetailPerm] = useState<PermissionBaseVO | null>(null)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await permissionsApi.getPermissionGroups()
      if (res.code === 200 && res.data) {
        setGroups(res.data)
        setExpandedGroups(new Set(res.data.map((g: PermissionGroupVO) => g.groupKey!).filter(Boolean)))
      }
    } catch {
      toast({ title: '获取权限列表失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  const toggleExpand = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const expandAll = () => setExpandedGroups(new Set(groups.map(g => g.groupKey!).filter(Boolean)))
  const collapseAll = () => setExpandedGroups(new Set())

  const filteredGroups = useMemo(() => {
    if (!searchKeyword.trim()) return groups
    const kw = searchKeyword.toLowerCase()
    return groups
      .map(group => {
        const groupMatch = group.groupName?.toLowerCase().includes(kw) || group.groupKey?.toLowerCase().includes(kw)
        const matchedChildren = (group.children || []).filter(
          c => c.name?.toLowerCase().includes(kw) || c.path?.toLowerCase().includes(kw) || c.code?.toLowerCase().includes(kw)
        )
        const gpMatch = group.groupPermission &&
          (group.groupPermission.name?.toLowerCase().includes(kw) || group.groupPermission.path?.toLowerCase().includes(kw))

        if (groupMatch) return group
        if (gpMatch || matchedChildren.length > 0) {
          return { ...group, children: matchedChildren.length > 0 ? matchedChildren : group.children }
        }
        return null
      })
      .filter(Boolean) as PermissionGroupVO[]
  }, [groups, searchKeyword])

  const totalGroups = groups.length
  const totalPerms = groups.reduce((sum, g) => sum + (g.children?.length || 0) + (g.groupPermission ? 1 : 0), 0)

  const renderPermRow = (perm: PermissionBaseVO, isGroupPerm: boolean) => (
    <div key={perm.id} className={`flex items-center gap-2.5 py-2 px-3 rounded-md transition-colors hover:bg-muted/50 ${isGroupPerm ? 'bg-primary/5' : ''}`}>
      {/* 图标 */}
      {isGroupPerm
        ? <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
        : <FileText className="w-4 h-4 text-muted-foreground/60 shrink-0" />
      }

      {/* 方法标签（固定宽度对齐） */}
      <MethodBadge method={perm.method} />

      {/* 名称 */}
      <span className="text-sm font-medium min-w-0 truncate">{perm.name}</span>
      {isGroupPerm && <Badge variant="outline" className="text-xs shrink-0 border-amber-300 text-amber-600">组</Badge>}

      {/* 路径 */}
      <span className="text-xs text-muted-foreground truncate hidden sm:inline">{perm.path}</span>

      {/* 右侧操作 */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {perm.status === 1
          ? <CircleCheck className="w-4 h-4 text-emerald-500" />
          : <CircleX className="w-4 h-4 text-muted-foreground/40" />
        }
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); setDetailPerm(perm) }}
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">权限管理</h1>
          <p className="text-muted-foreground mt-1">
            查看系统权限资源 &mdash; {totalGroups} 个分组，{totalPerms} 个权限
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>全部展开</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>全部折叠</Button>
          <Button variant="outline" size="sm" onClick={fetchGroups} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />刷新
          </Button>
        </div>
      </div>

      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="搜索权限名称、路径、编码..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="pl-9 h-9" />
      </div>

      {loading ? (
        <CardGroupSkeleton groups={4} itemsPerGroup={5} />
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            {searchKeyword ? '没有匹配的权限' : '暂无权限数据，请运行同步脚本'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(group => {
            const expanded = expandedGroups.has(group.groupKey!)
            const childCount = group.children?.length || 0
            const gp = group.groupPermission

            return (
              <Card key={group.groupKey} className="overflow-hidden">
                <button
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(group.groupKey!)}
                >
                  {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  <FolderOpen className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="font-semibold">{group.groupName}</span>
                  <Badge variant="outline" className="text-xs font-mono">{group.groupKey}</Badge>
                  {gp && <span className="text-xs text-muted-foreground hidden sm:inline">{gp.path}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {childCount} 个接口{gp ? ' + 1 组权限' : ''}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t px-2 py-1.5 space-y-0.5">
                    {gp && renderPermRow(gp, true)}
                    {group.children?.map(child => renderPermRow(child, false))}
                    {childCount === 0 && !gp && (
                      <div className="text-sm text-muted-foreground text-center py-4">该分组下暂无权限</div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* 详情弹窗 */}
      <Dialog open={!!detailPerm} onOpenChange={(open) => { if (!open) setDetailPerm(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>权限详情</DialogTitle>
          </DialogHeader>
          {detailPerm && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[80px_1fr] gap-y-2.5">
                <span className="text-muted-foreground">名称</span>
                <span className="font-medium">{detailPerm.name}</span>

                <span className="text-muted-foreground">编码</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">{detailPerm.code}</code>

                <span className="text-muted-foreground">路径</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">{detailPerm.path}</code>

                <span className="text-muted-foreground">方法</span>
                <div><MethodBadge method={detailPerm.method} /></div>

                <span className="text-muted-foreground">类型</span>
                <span>{detailPerm.isGroup ? '组权限' : '接口权限'}</span>

                <span className="text-muted-foreground">分组</span>
                <span>{detailPerm.groupName} <code className="text-xs text-muted-foreground">({detailPerm.groupKey})</code></span>

                <span className="text-muted-foreground">状态</span>
                <span>{detailPerm.status === 1
                  ? <Badge className="bg-emerald-500 text-xs">启用</Badge>
                  : <Badge variant="destructive" className="text-xs">禁用</Badge>
                }</span>

                {detailPerm.description && (
                  <>
                    <span className="text-muted-foreground">描述</span>
                    <span className="text-muted-foreground">{detailPerm.description}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
