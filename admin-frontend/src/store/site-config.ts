import { create } from 'zustand'
import { AXIOS_INSTANCE } from '@/api/custom-instance'

export interface SiteConfig {
  site_title: string
  site_name: string
  site_subtitle: string
  site_logo: string
  site_favicon: string
  site_footer: string
  login_captcha_enabled: string
  login_welcome_text: string
  login_bg_image: string
  default_theme: string
}

const DEFAULTS: SiteConfig = {
  site_title: 'Admin Platform',
  site_name: 'Admin',
  site_subtitle: '管理系统',
  site_logo: '',
  site_favicon: '',
  site_footer: '© 2026 Admin Platform',
  login_captcha_enabled: 'true',
  login_welcome_text: '欢迎回来',
  login_bg_image: '',
  default_theme: 'system',
}

interface SiteConfigStore {
  config: SiteConfig
  loaded: boolean
  fetchConfig: () => Promise<void>
}

export const useSiteConfigStore = create<SiteConfigStore>()((set) => ({
  config: { ...DEFAULTS },
  loaded: false,

  fetchConfig: async () => {
    try {
      const res = await AXIOS_INSTANCE.get('/api/admin/system-config/public')
      if (res.data?.code === 200 && res.data?.data) {
        const items: Array<{ configKey?: string; configValue?: string }> = res.data.data
        const merged = { ...DEFAULTS }
        for (const item of items) {
          if (item.configKey && item.configKey in merged) {
            ;(merged as Record<string, string>)[item.configKey] = item.configValue ?? ''
          }
        }
        set({ config: merged, loaded: true })

        // 应用 document.title
        if (merged.site_title) {
          document.title = merged.site_title
        }

        // 应用 favicon
        if (merged.site_favicon) {
          applyFavicon(merged.site_favicon)
        }
      }
    } catch {
      // 公开接口失败不影响使用，保持默认值
      set({ loaded: true })
    }
  },
}))

function applyFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = url
}
