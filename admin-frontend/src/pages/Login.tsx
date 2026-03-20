import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getCaptcha, login } from '@/api/generated/auth/auth'
import type { CaptchaVO } from '@/api/generated/model'
import { useAuthStore } from '@/store/auth'
import { Shield } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { setTokens, setUser, isAuthenticated } = useAuthStore()
  const [captcha, setCaptcha] = useState<CaptchaVO>({})
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    username: '',
    password: '',
    captchaCode: '',
  })
  const [error, setError] = useState('')

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // Fetch captcha on mount
  useEffect(() => {
    fetchCaptcha()
  }, [])

  const fetchCaptcha = async () => {
    try {
      const res = await getCaptcha({} as RequestInit)
      const data = res.data as unknown as { code: number; message: string; data: CaptchaVO }
      if (data.code === 200) {
        setCaptcha(data.data)
      }
    } catch {
      setError('获取验证码失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.username || !form.password || !form.captchaCode) {
      setError('请填写所有字段')
      return
    }

    if (!captcha.captchaKey) {
      setError('验证码已过期，请刷新')
      return
    }

    setLoading(true)
    try {
      const res = await login(
        {
          username: form.username,
          password: form.password,
          captchaKey: captcha.captchaKey,
          captchaCode: form.captchaCode,
        },
        {} as RequestInit
      )

      const data = res.data as unknown as {
        code: number
        message: string
        data: {
          accessToken: string
          refreshToken: string
          user: unknown
        }
      }

      if (data.code === 200) {
        setTokens(data.data.accessToken, data.data.refreshToken)
        setUser(data.data.user as never)
        navigate('/')
      } else {
        setError(data.message || '登录失败')
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary text-primary-foreground p-3">
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">管理员登录</CardTitle>
          <CardDescription>请输入您的账号信息登录系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive text-center p-2 bg-destructive/10 rounded">
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
                  className="flex-1"
                  maxLength={6}
                />
                {captcha.captchaImage && (
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    className="flex-shrink-0 rounded border border-border overflow-hidden"
                  >
                    <img
                      src={captcha.captchaImage}
                      alt="验证码"
                      className="h-9 w-auto cursor-pointer hover:opacity-80"
                    />
                  </button>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
