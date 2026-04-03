import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getAuth } from '@/api/generated/auth/auth'
import type { CaptchaVO } from '@/api/generated/model'
import { useAuthStore } from '@/store/auth'
import { useSiteConfigStore } from '@/store/site-config'
import { useToast } from '@/hooks/use-toast'
import { Shield, LayoutDashboard } from 'lucide-react'

const authApi = getAuth()
const { getCaptcha, login } = authApi

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { setLoginData, isAuthenticated } = useAuthStore()
  const { config, fetchConfig } = useSiteConfigStore()
  const [captcha, setCaptcha] = useState<CaptchaVO>({})
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', captchaCode: '' })
  const [error, setError] = useState('')

  useEffect(() => { fetchConfig() }, [fetchConfig])
  useEffect(() => { if (isAuthenticated) navigate('/') }, [isAuthenticated, navigate])
  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      toast({ title: '登录失效！', description: '请重新登录', variant: 'destructive' })
    }
  }, [searchParams, toast])
  useEffect(() => { fetchCaptcha() }, [])

  const fetchCaptcha = async () => {
    try {
      const res = await getCaptcha()
      if (res.code === 200 && res.data) setCaptcha(res.data)
    } catch {
      setError('获取验证码失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.password || !form.captchaCode) { setError('请填写所有字段'); return }
    if (!captcha.captchaKey) { setError('验证码已过期，请刷新'); return }

    setLoading(true)
    try {
      const res = await login({
        username: form.username,
        password: form.password,
        captchaKey: captcha.captchaKey,
        captchaCode: form.captchaCode,
      })
      if (res.code === 200 && res.data) {
        const d = res.data
        setLoginData(d.accessToken!, d.refreshToken!, d.user!, d.menus ?? [])
        navigate('/')
      } else {
        setError(res.message || '登录失败')
        fetchCaptcha()
      }
    } catch {
      setError('登录请求失败')
      fetchCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌区 */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col justify-between p-12 text-white"
        style={{
          background: config.login_bg_image
            ? `url(${config.login_bg_image}) center/cover no-repeat`
            : 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)',
        }}
      >
        {/* 遮罩层 */}
        {config.login_bg_image && <div className="absolute inset-0 bg-black/40" />}

        {/* Logo + 站点名 */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-white/20 backdrop-blur-sm overflow-hidden">
            {config.site_logo ? (
              <img src={config.site_logo} alt={config.site_name} className="size-6 object-contain" />
            ) : (
              <LayoutDashboard className="size-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold">{config.site_name || 'Admin'}</h2>
            <p className="text-sm text-white/70">{config.site_subtitle || '管理系统'}</p>
          </div>
        </div>

        {/* 欢迎语 */}
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            {config.login_welcome_text || '欢迎使用管理系统'}
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            安全、高效、易用的后台管理平台
          </p>
        </div>

        {/* 底部装饰 */}
        <div className="relative z-10 text-sm text-white/50">
          {config.site_name || 'Admin'} &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* 右侧登录区 */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* 移动端 Logo（lg 以下显示） */}
          <div className="flex flex-col items-center lg:hidden">
            <div className="flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground mb-3 overflow-hidden">
              {config.site_logo ? (
                <img src={config.site_logo} alt={config.site_name} className="size-7 object-contain" />
              ) : (
                <Shield className="size-6" />
              )}
            </div>
            <h1 className="text-xl font-bold">{config.site_name || '管理系统'}</h1>
          </div>

          {/* 标题 */}
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight">登录</h1>
            <p className="text-muted-foreground mt-1">请输入您的账号信息</p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm text-destructive text-center p-2.5 bg-destructive/10 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="captchaCode">验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="captchaCode"
                  type="text"
                  placeholder="请输入验证码"
                  value={form.captchaCode}
                  onChange={(e) => setForm({ ...form, captchaCode: e.target.value })}
                  className="flex-1 h-10"
                  maxLength={6}
                />
                {captcha.captchaImage && (
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    className="flex-shrink-0 rounded-lg border border-border overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img src={captcha.captchaImage} alt="验证码" className="h-10 w-auto" />
                  </button>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            {config.site_name || 'Admin'} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
