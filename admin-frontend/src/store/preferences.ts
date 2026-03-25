import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NoticeSpeed = 'slow' | 'normal' | 'fast'
export type SidebarStyle = 'default' | 'compact' | 'flat' | 'collapsible'
export type AvatarPosition = 'header' | 'sidebar'

interface PreferencesState {
  // 通知偏好
  showHeaderNotice: boolean
  noticeSpeed: NoticeSpeed

  // 布局偏好
  sidebarCollapsed: boolean
  sidebarStyle: SidebarStyle
  avatarPosition: AvatarPosition

  // 已读通知
  readNoticeIds: number[]

  // Actions
  setShowHeaderNotice: (v: boolean) => void
  setNoticeSpeed: (v: NoticeSpeed) => void
  setSidebarCollapsed: (v: boolean) => void
  setSidebarStyle: (v: SidebarStyle) => void
  setAvatarPosition: (v: AvatarPosition) => void
  markNoticeRead: (id: number) => void
  markAllNoticesRead: (ids: number[]) => void
  isNoticeRead: (id: number) => boolean
}

/** 轮播速度映射（毫秒） */
export const NOTICE_SPEED_MAP: Record<NoticeSpeed, number> = {
  slow: 8000,
  normal: 5000,
  fast: 3000,
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      showHeaderNotice: true,
      noticeSpeed: 'normal',
      sidebarCollapsed: false,
      sidebarStyle: 'default',
      avatarPosition: 'header',
      readNoticeIds: [],

      setShowHeaderNotice: (v) => set({ showHeaderNotice: v }),
      setNoticeSpeed: (v) => set({ noticeSpeed: v }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setSidebarStyle: (v) => set({ sidebarStyle: v }),
      setAvatarPosition: (v) => set({ avatarPosition: v }),

      markNoticeRead: (id) => {
        const ids = get().readNoticeIds
        if (!ids.includes(id)) {
          set({ readNoticeIds: [...ids, id] })
        }
      },

      markAllNoticesRead: (ids) => {
        const current = new Set(get().readNoticeIds)
        ids.forEach(id => current.add(id))
        set({ readNoticeIds: Array.from(current) })
      },

      isNoticeRead: (id) => get().readNoticeIds.includes(id),
    }),
    { name: 'preferences-storage' }
  )
)
