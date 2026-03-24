import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, LogOut } from 'lucide-react'
import { getOnlineUsers } from '@/api/generated/online-users/online-users'
import type { OnlineUserVO } from '@/api/generated/model'
import { useAuthStore } from '@/store/auth'
import { TableSkeleton } from '@/components/skeletons'

const onlineApi = getOnlineUsers()

export default function OnlineUsers() {
  const { toast } = useToast()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [users, setUsers] = useState<OnlineUserVO[]>([])
  const [loading, setLoading] = useState(false)
  const [kickTarget, setKickTarget] = useState<OnlineUserVO | null>(null)
  const [kicking, setKicking] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await onlineApi.listOnlineUsers()
      if (res.code === 200 && res.data) {
        setUsers(res.data)
      }
    } catch {
      toast({ title: '获取在线用户失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchUsers()
    intervalRef.current = setInterval(fetchUsers, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchUsers])

  const handleKick = async () => {
    if (!kickTarget?.userId) return
    setKicking(true)
    try {
      const res = await onlineApi.forceUserOffline(kickTarget.userId)
      if (res.code === 200) {
        toast({ title: `已将 ${kickTarget.username} 强制下线` })
        setKickTarget(null)
        fetchUsers()
      } else {
        toast({ title: res.message ?? '操作失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setKicking(false)
    }
  }

  const formatTime = (t?: string) => t?.replace('T', ' ').substring(0, 19) ?? '-'

  const truncateUA = (ua?: string) => {
    if (!ua) return '-'
    return ua.length > 60 ? ua.substring(0, 60) + '...' : ua
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">在线用户</h1>
        <p className="text-muted-foreground mt-1">查看当前在线用户，支持强制下线</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">
              在线用户
              <Badge variant="secondary" className="ml-2 text-xs">{users.length}</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden mx-4 mb-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-center h-10">用户名</TableHead>
                  <TableHead className="text-center">昵称</TableHead>
                  <TableHead className="text-center">登录IP</TableHead>
                  <TableHead className="text-center">浏览器</TableHead>
                  <TableHead className="w-44 text-center">登录时间</TableHead>
                  <TableHead className="w-44 text-center">最后活跃</TableHead>
                  <TableHead className="w-20 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && users.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="p-0"><TableSkeleton rows={5} cols={7} /></TableCell></TableRow>
                ) : users.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">暂无在线用户</TableCell></TableRow>
                ) : users.map((user, i) => {
                  const isSelf = user.userId === currentUserId
                  return (
                    <TableRow key={user.userId} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <TableCell className="text-center font-medium py-2.5">
                        {user.username}
                        {isSelf && <Badge variant="outline" className="ml-1.5 text-xs">本人</Badge>}
                      </TableCell>
                      <TableCell className="text-center py-2.5">{user.nickname ?? '-'}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm font-mono">{user.loginIp ?? '-'}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm max-w-xs">
                        <span title={user.userAgent}>{truncateUA(user.userAgent)}</span>
                      </TableCell>
                      <TableCell className="text-center py-2.5 text-sm">{formatTime(user.loginTime)}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm">{formatTime(user.lastActiveTime)}</TableCell>
                      <TableCell className="text-center py-2.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={isSelf}
                          title={isSelf ? '不能踢自己' : '强制下线'}
                          onClick={() => setKickTarget(user)}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 pb-4 text-sm text-muted-foreground">
            每 30 秒自动刷新 · 会话有效期约 6 分钟
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!kickTarget} onOpenChange={() => setKickTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认强制下线</DialogTitle>
            <DialogDescription>
              确定要将用户 <strong>{kickTarget?.username}</strong>（{kickTarget?.nickname ?? '-'}）强制下线吗？该用户将立即被登出。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setKickTarget(null)} disabled={kicking}>取消</Button>
            <Button variant="destructive" onClick={handleKick} disabled={kicking}>
              {kicking ? '处理中...' : '确认下线'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
