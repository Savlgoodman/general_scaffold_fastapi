import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, LogOut, Eye } from 'lucide-react'
import { getOnlineUsers } from '@/api/javaedition/online-users/online-users'
import { getAdminUsers } from '@/api/javaedition/admin-users/admin-users'
import type { OnlineUserVO } from '@/api/javaedition/model'
import { useAuthStore } from '@/store/auth'
import { TableSkeleton } from '@/components/skeletons'

const onlineApi = getOnlineUsers()
const usersApi = getAdminUsers()

export default function OnlineUsers() {
  const { toast } = useToast()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [users, setUsers] = useState<OnlineUserVO[]>([])
  const [loading, setLoading] = useState(false)

  // 踢人确认
  const [kickTarget, setKickTarget] = useState<OnlineUserVO | null>(null)
  const [kicking, setKicking] = useState(false)

  // 详情弹窗
  const [detailTarget, setDetailTarget] = useState<OnlineUserVO | null>(null)

  // 拉黑确认（踢人成功后弹出）
  const [banTarget, setBanTarget] = useState<OnlineUserVO | null>(null)
  const [banning, setBanning] = useState(false)

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
        const kicked = kickTarget
        setKickTarget(null)
        fetchUsers()
        // 踢人成功后弹出拉黑确认
        setBanTarget(kicked)
      } else {
        toast({ title: res.message ?? '操作失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '操作失败', variant: 'destructive' })
    } finally {
      setKicking(false)
    }
  }

  const handleBan = async () => {
    if (!banTarget?.userId) return
    setBanning(true)
    try {
      const res = await usersApi.updateUser(banTarget.userId, { status: 0 })
      if (res.code === 200) {
        toast({ title: `已禁用用户 ${banTarget.username}` })
        setBanTarget(null)
      } else {
        toast({ title: res.message ?? '禁用失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '禁用失败', variant: 'destructive' })
    } finally {
      setBanning(false)
    }
  }

  const formatTime = (t?: string) => t?.replace('T', ' ').substring(0, 19) ?? '-'

  const getDisplayName = (user: OnlineUserVO) => user.nickname || user.username || '?'

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
                  <TableHead className="w-16 text-center h-10">头像</TableHead>
                  <TableHead className="text-center">用户名</TableHead>
                  <TableHead className="text-center">昵称</TableHead>
                  <TableHead className="text-center">登录IP</TableHead>
                  <TableHead className="w-44 text-center">登录时间</TableHead>
                  <TableHead className="w-44 text-center">最后活跃</TableHead>
                  <TableHead className="w-28 text-center">操作</TableHead>
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
                      <TableCell className="text-center py-2.5">
                        <div className="flex justify-center">
                          <Avatar className="size-8">
                            <AvatarImage src={user.avatar} alt={getDisplayName(user)} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getDisplayName(user).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium py-2.5">
                        {user.username}
                        {isSelf && <Badge variant="outline" className="ml-1.5 text-xs">本人</Badge>}
                      </TableCell>
                      <TableCell className="text-center py-2.5">{user.nickname ?? '-'}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm font-mono">{user.loginIp ?? '-'}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm">{formatTime(user.loginTime)}</TableCell>
                      <TableCell className="text-center py-2.5 text-sm">{formatTime(user.lastActiveTime)}</TableCell>
                      <TableCell className="text-center py-2.5">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="查看详情"
                            onClick={() => setDetailTarget(user)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
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
                        </div>
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

      {/* 详情弹窗 */}
      <Dialog open={!!detailTarget} onOpenChange={() => setDetailTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>用户在线详情</DialogTitle>
          </DialogHeader>
          {detailTarget && (
            <div className="space-y-4">
              {/* 用户信息 */}
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarImage src={detailTarget.avatar} alt={getDisplayName(detailTarget)} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {getDisplayName(detailTarget).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-lg">{detailTarget.nickname || '-'}</div>
                  <div className="text-sm text-muted-foreground">@{detailTarget.username}</div>
                  <div className="text-xs text-muted-foreground">ID: {detailTarget.userId}</div>
                </div>
              </div>

              {/* 登录信息 */}
              <div className="space-y-2 text-sm">
                <h4 className="font-medium text-muted-foreground">登录信息</h4>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <span className="text-muted-foreground">登录 IP：</span>
                  <span className="font-mono">{detailTarget.loginIp ?? '-'}</span>
                  <span className="text-muted-foreground">登录时间：</span>
                  <span>{formatTime(detailTarget.loginTime)}</span>
                  <span className="text-muted-foreground">最后活跃：</span>
                  <span>{formatTime(detailTarget.lastActiveTime)}</span>
                </div>
              </div>

              {/* 浏览器信息 */}
              <div className="space-y-2 text-sm">
                <h4 className="font-medium text-muted-foreground">浏览器信息</h4>
                <div className="text-xs break-all bg-muted/50 rounded-md p-3 font-mono">
                  {detailTarget.userAgent || '-'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 踢人确认弹窗 */}
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

      {/* 拉黑确认弹窗（踢人成功后弹出） */}
      <Dialog open={!!banTarget} onOpenChange={() => setBanTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>是否禁用该用户？</DialogTitle>
            <DialogDescription>
              用户 <strong>{banTarget?.username}</strong> 已被强制下线。是否同时禁用该用户账户，防止其重新登录？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBanTarget(null)} disabled={banning}>跳过</Button>
            <Button variant="destructive" onClick={handleBan} disabled={banning}>
              {banning ? '处理中...' : '禁用用户'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
