import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Camera, Save } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { getAdminUsers } from '@/api/generated/admin-users/admin-users'
import { AXIOS_INSTANCE } from '@/api/custom-instance'
import AvatarCropDialog from '@/components/AvatarCropDialog'

const usersApi = getAdminUsers()

export default function Profile() {
  const { toast } = useToast()
  const { user, setUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [nickname, setNickname] = useState(user?.nickname || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState((user as any)?.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPwd, setChangingPwd] = useState(false)

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '')
      setEmail(user.email || '')
      setPhone((user as any).phone || '')
      setAvatarUrl(user.avatar || '')
    }
  }, [user])

  const displayName = user?.nickname || user?.username || 'User'

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: '图片不能超过5MB', variant: 'destructive' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCropComplete = async (blob: Blob) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', blob, 'avatar.png')
      const res = await AXIOS_INSTANCE.post('/api/admin/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (res.data?.code === 200 && res.data?.data?.url) {
        setAvatarUrl(res.data.data.url)
        if (user) {
          setUser({ ...user, avatar: res.data.data.url })
        }
        toast({ title: '头像上传成功' })
      } else {
        toast({ title: '上传失败', description: res.data?.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '上传失败', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const res = await usersApi.updateUser(user.id, {
        nickname: nickname || undefined,
        email: email || undefined,
        phone: phone || undefined,
      } as any)
      if (res.code === 200) {
        if (user) {
          setUser({ ...user, nickname, email } as any)
        }
        toast({ title: '保存成功' })
      } else {
        toast({ title: '保存失败', description: res.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '保存失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword) { toast({ title: '请输入新密码', variant: 'destructive' }); return }
    if (newPassword !== confirmPassword) { toast({ title: '两次密码不一致', variant: 'destructive' }); return }
    if (newPassword.length < 6) { toast({ title: '密码至少6位', variant: 'destructive' }); return }
    if (!user?.id) return

    setChangingPwd(true)
    try {
      const res = await usersApi.updateUser(user.id, { password: newPassword })
      if (res.code === 200) {
        toast({ title: '密码修改成功' })
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast({ title: '修改失败', description: res.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '修改失败', variant: 'destructive' })
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">个人中心</h1>
        <p className="text-muted-foreground mt-1">管理你的个人信息</p>
      </div>

      {/* 头像区域 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">头像</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="size-24">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileSelect} />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-muted-foreground">点击头像上传新图片（≤2MB，jpg/png/gif/webp）</p>
              {uploading && <p className="text-sm text-primary">上传中...</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 基本信息 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">基本信息</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>用户名</Label>
            <Input value={user?.username || ''} disabled className="bg-muted" />
          </div>
          <div className="grid gap-2">
            <Label>昵称</Label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="请输入昵称" />
          </div>
          <div className="grid gap-2">
            <Label>邮箱</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="请输入邮箱" type="email" />
          </div>
          <div className="grid gap-2">
            <Label>手机号</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? '保存中...' : '保存修改'}
          </Button>
        </CardContent>
      </Card>

      {/* 修改密码 */}
      <Card>
        <CardHeader><CardTitle className="text-lg">修改密码</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>新密码</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="请输入新密码（至少6位）" />
          </div>
          <div className="grid gap-2">
            <Label>确认密码</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="请再次输入新密码" />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPwd}>
            {changingPwd ? '修改中...' : '修改密码'}
          </Button>
        </CardContent>
      </Card>

      {/* 头像裁剪弹窗 */}
      {cropSrc && (
        <AvatarCropDialog
          open={!!cropSrc}
          onOpenChange={(open) => { if (!open) setCropSrc(null) }}
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
