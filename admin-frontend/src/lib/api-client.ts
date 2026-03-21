import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/auth'

const API_BASE_URL = '/api/admin'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：添加token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理错误
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError) => {
    // 401 或 403 未登录 都自动退出
    if (error.response?.status === 401 || error.response?.status === 403) {
      // 检查是否是真的未登录（message为"未登录"）
      const data = error.response.data as { code?: number; message?: string } | undefined
      if (error.response.status === 401 || data?.message === '未登录') {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export { apiClient, API_BASE_URL }
