import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Save, RotateCcw, Upload, Shield, Palette, Settings2 } from 'lucide-react'
import { AXIOS_INSTANCE } from '@/api/custom-instance'
import { useSiteConfigStore } from '@/store/site-config'
import { CardGroupSkeleton } from '@/components/skeletons'

interface ConfigItem {
  configKey: string
  configValue: string
  description: string
}

interface ConfigGroup {
  groupName: string
  items: ConfigItem[]
}

const GROUP_META: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  basic: { label: '基础设置', description: '站点名称、Logo、页脚等基础信息', icon: <Settings2 className="w-4 h-4" /> },
  security: { label: '安全设置', description: '登录策略、密码规则、会话管理', icon: <Shield className="w-4 h-4" /> },
  appearance: { label: '外观设置', description: '主题、登录页外观等个性化配置', icon: <Palette className="w-4 h-4" /> },
}

const DEFAULTS: Record<string, string> = {
  site_title: 'Admin Platform',
  site_name: 'Admin',
  site_subtitle: '管理系统',
  site_logo: '',
  site_favicon: '',
  site_footer: '© 2026 Admin Platform',
  login_captcha_enabled: 'true',
  login_max_retry: '5',
  login_lock_duration: '30',
  password_min_length: '6',
  session_timeout: '30',
  default_theme: 'system',
  sidebar_collapsed: 'false',
  login_bg_image: '',
  login_welcome_text: '欢迎回来',
}

// 布尔类型的配置项
const BOOLEAN_KEYS = new Set(['login_captcha_enabled', 'sidebar_collapsed'])

// 数字类型的配置项
const NUMBER_KEYS = new Set(['login_max_retry', 'login_lock_duration', 'password_min_length', 'session_timeout'])

// 图片上传类型的配置项
const IMAGE_KEYS = new Set(['site_logo', 'site_favicon', 'login_bg_image'])

// 数字配置的单位
const NUMBER_UNITS: Record<string, string> = {
  login_max_retry: '次',
  login_lock_duration: '分钟',
  password_min_length: '位',
  session_timeout: '分钟',
}

export default function SystemSettings() {
  const { toast } = useToast()
  const [groups, setGroups] = useState<ConfigGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const fetchConfig = useSiteConfigStore((s) => s.fetchConfig)

  const loadConfigs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await AXIOS_INSTANCE.get('/api/admin/system-config')
      if (res.data?.code === 200 && res.data?.data) {
        const data: ConfigGroup[] = res.data.data
        setGroups(data)
        const vals: Record<string, string> = {}
        for (const g of data) {
          for (const item of g.items) {
            vals[item.configKey] = item.configValue
          }
        }
        setOriginalValues(vals)
        setEditedValues(vals)
      }
    } catch {
      toast({ title: '加载配置失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadConfigs() }, [loadConfigs])

  const handleChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }))
  }

  const getGroupChangedKeys = (groupName: string): string[] => {
    const group = groups.find((g) => g.groupName === groupName)
    if (!group) return []
    return group.items
      .filter((item) => editedValues[item.configKey] !== originalValues[item.configKey])
      .map((item) => item.configKey)
  }

  const handleSave = async (groupName: string) => {
    const changedKeys = getGroupChangedKeys(groupName)
    if (changedKeys.length === 0) {
      toast({ title: '没有需要保存的变更' })
      return
    }

    setSaving(groupName)
    try {
      const configs = changedKeys.map((key) => ({
        configKey: key,
        configValue: editedValues[key],
      }))
      const res = await AXIOS_INSTANCE.put('/api/admin/system-config', { configs })
      if (res.data?.code === 200) {
        toast({ title: '保存成功' })
        setOriginalValues((prev) => {
          const next = { ...prev }
          for (const key of changedKeys) {
            next[key] = editedValues[key]
          }
          return next
        })
        // 刷新全局站点配置
        fetchConfig()
      } else {
        toast({ title: '保存失败', description: res.data?.message, variant: 'destructive' })
      }
    } catch {
      toast({ title: '保存失败', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  const handleReset = (groupName: string) => {
    const group = groups.find((g) => g.groupName === groupName)
    if (!group) return
    setEditedValues((prev) => {
      const next = { ...prev }
      for (const item of group.items) {
        next[item.configKey] = DEFAULTS[item.configKey] ?? ''
      }
      return next
    })
  }

  const handleImageUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingKey(key)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await AXIOS_INSTANCE.post('/api/admin/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { directory: 'system' },
      })
      if (res.data?.code === 200 && res.data?.data?.url) {
        handleChange(key, res.data.data.url)
        toast({ title: '上传成功' })
      } else {
        toast({ title: '上传失败', variant: 'destructive' })
      }
    } catch {
      toast({ title: '上传失败', variant: 'destructive' })
    } finally {
      setUploadingKey(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const renderField = (item: ConfigItem) => {
    const key = item.configKey
    const value = editedValues[key] ?? ''
    const isChanged = value !== originalValues[key]

    if (BOOLEAN_KEYS.has(key)) {
      return (
        <div key={key} className="flex items-center justify-between py-3">
          <div className="space-y-0.5">
            <Label className={isChanged ? 'text-primary font-semibold' : ''}>{item.description}</Label>
            <p className="text-xs text-muted-foreground font-mono">{key}</p>
          </div>
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => handleChange(key, String(checked))}
          />
        </div>
      )
    }

    if (IMAGE_KEYS.has(key)) {
      return (
        <div key={key} className="space-y-2 py-3">
          <div className="space-y-0.5">
            <Label className={isChanged ? 'text-primary font-semibold' : ''}>{item.description}</Label>
            <p className="text-xs text-muted-foreground font-mono">{key}</p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder="输入图片 URL 或上传文件"
              className="flex-1"
            />
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                disabled={uploadingKey === key}
                onClick={() => {
                  fileInputRef.current?.setAttribute('data-key', key)
                  fileInputRef.current?.click()
                }}
              >
                <Upload className={`w-3.5 h-3.5 mr-1.5 ${uploadingKey === key ? 'animate-pulse' : ''}`} />
                {uploadingKey === key ? '上传中' : '上传'}
              </Button>
            </div>
          </div>
          {value && (
            <div className="flex items-center gap-2 mt-1">
              <div className="border rounded p-1 bg-muted/30">
                <img
                  src={value}
                  alt={item.description}
                  className={key === 'site_favicon' ? 'w-6 h-6 object-contain' : 'h-10 max-w-40 object-contain'}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <span className="text-xs text-muted-foreground">预览</span>
            </div>
          )}
        </div>
      )
    }

    if (NUMBER_KEYS.has(key)) {
      return (
        <div key={key} className="space-y-2 py-3">
          <div className="space-y-0.5">
            <Label className={isChanged ? 'text-primary font-semibold' : ''}>{item.description}</Label>
            <p className="text-xs text-muted-foreground font-mono">{key}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-32"
              min={1}
            />
            {NUMBER_UNITS[key] && <span className="text-sm text-muted-foreground">{NUMBER_UNITS[key]}</span>}
          </div>
        </div>
      )
    }

    // 默认文本输入
    return (
      <div key={key} className="space-y-2 py-3">
        <div className="space-y-0.5">
          <Label className={isChanged ? 'text-primary font-semibold' : ''}>{item.description}</Label>
          <p className="text-xs text-muted-foreground font-mono">{key}</p>
        </div>
        <Input
          value={value}
          onChange={(e) => handleChange(key, e.target.value)}
          placeholder={DEFAULTS[key] || ''}
        />
      </div>
    )
  }

  const renderGroupContent = (groupName: string) => {
    const group = groups.find((g) => g.groupName === groupName)
    if (!group) return null
    const changedCount = getGroupChangedKeys(groupName).length

    return (
      <div className="space-y-1">
        {group.items.map((item, i) => (
          <div key={item.configKey}>
            {renderField(item)}
            {i < group.items.length - 1 && <Separator />}
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" size="sm" onClick={() => handleReset(groupName)}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />恢复默认
          </Button>
          <div className="flex items-center gap-3">
            {changedCount > 0 && (
              <span className="text-xs text-muted-foreground">{changedCount} 项变更</span>
            )}
            <Button
              size="sm"
              onClick={() => handleSave(groupName)}
              disabled={saving === groupName || changedCount === 0}
            >
              <Save className={`w-3.5 h-3.5 mr-1.5 ${saving === groupName ? 'animate-pulse' : ''}`} />
              {saving === groupName ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
        <p className="text-muted-foreground mt-1">管理系统全局配置</p>
      </div>

      {/* 隐藏的文件上传 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const key = fileInputRef.current?.getAttribute('data-key')
          if (key) handleImageUpload(key, e)
        }}
      />

      {loading ? (
        <CardGroupSkeleton groups={3} itemsPerGroup={5} />
      ) : (
        <Tabs defaultValue="basic">
          <TabsList>
            {Object.entries(GROUP_META).map(([key, meta]) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                {meta.icon}
                {meta.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(GROUP_META).map(([key, meta]) => (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {meta.icon}
                    {meta.label}
                  </CardTitle>
                  <CardDescription>{meta.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {renderGroupContent(key)}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
