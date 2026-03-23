/**
 * Orval 自定义 Axios 实例
 * orval 生成的代码会调用此文件导出的 customInstance 函数
 * 生成的 URL 已包含完整路径（如 /api/admin/roles），所以 baseURL 留空
 */
import Axios, { AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/hooks/use-toast'

export const AXIOS_INSTANCE = Axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：注入 token
AXIOS_INSTANCE.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Refresh token 状态管理
let isRefreshing = false
let pendingRequests: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function onRefreshed(newToken: string) {
  pendingRequests.forEach(({ resolve }) => resolve(newToken))
  pendingRequests = []
}

function onRefreshFailed(error: unknown) {
  pendingRequests.forEach(({ reject }) => reject(error))
  pendingRequests = []
}

function handleLogoutWithToast() {
  useAuthStore.getState().logout()
  toast({
    title: '登录失效！',
    description: '请重新登录',
    variant: 'destructive',
  })
  window.location.href = '/login'
}

// 响应拦截器：401 自动刷新 token
AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 非 401 错误直接抛出
    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // 刷新接口本身 401，直接退出
    if (originalRequest.url === '/api/admin/auth/refresh') {
      handleLogoutWithToast()
      return Promise.reject(error)
    }

    // 已经重试过，直接退出
    if (originalRequest._retry) {
      handleLogoutWithToast()
      return Promise.reject(error)
    }

    const { refreshToken: storedRefreshToken } = useAuthStore.getState()

    // 没有 refresh token，直接退出
    if (!storedRefreshToken) {
      handleLogoutWithToast()
      return Promise.reject(error)
    }

    // 如果正在刷新，排队等待
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            originalRequest._retry = true
            resolve(AXIOS_INSTANCE(originalRequest))
          },
          reject,
        })
      })
    }

    // 开始刷新
    isRefreshing = true
    originalRequest._retry = true

    try {
      const res = await AXIOS_INSTANCE.post('/api/admin/auth/refresh', {
        refreshToken: storedRefreshToken,
      })

      const data = res.data
      if (data.code === 200 && data.data) {
        const { accessToken, refreshToken, user, menus } = data.data
        useAuthStore.getState().setLoginData(
          accessToken,
          refreshToken,
          user,
          menus ?? [],
        )

        // 重试原请求
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        onRefreshed(accessToken)
        return AXIOS_INSTANCE(originalRequest)
      } else {
        onRefreshFailed(error)
        handleLogoutWithToast()
        return Promise.reject(error)
      }
    } catch (refreshError) {
      onRefreshFailed(refreshError)
      handleLogoutWithToast()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

/**
 * orval 生成代码调用的自定义请求函数
 * 去掉 responseType: 'blob'，返回 JSON 响应体
 */
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  // 去掉 orval 生成的 responseType: 'blob'
  const { responseType, ...restConfig } = config
  return AXIOS_INSTANCE({
    ...restConfig,
    ...options,
  }).then(({ data }) => data)
}

export type ErrorType<Error> = AxiosError<Error>
export type BodyType<BodyData> = BodyData
