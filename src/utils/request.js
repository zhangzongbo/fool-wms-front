import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：注入 sa-token
request.interceptors.request.use(
  (config) => {
    const tokenName = localStorage.getItem('tokenName') || 'satoken'
    const tokenValue = localStorage.getItem('token')
    if (tokenValue) {
      config.headers[tokenName] = tokenValue
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // blob 直接返回
    if (response.config.responseType === 'blob') {
      return response.data
    }

    const { code, message, data, success } = response.data || {}

    // 统一返回体：code===200 即成功
    if (code === 200 || code === 0 || success === true) {
      return data
    }

    // 未登录/登录失效
    if (code === 401) {
      handleUnauthorized()
      return Promise.reject(new Error(message || '登录已失效'))
    }

    ElMessage.error(message || '请求失败')
    return Promise.reject(new Error(message || '请求失败'))
  },
  (error) => {
    let errorMessage = '网络错误'

    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 401:
          handleUnauthorized()
          return Promise.reject(error)
        case 403:
          errorMessage = data?.message || '暂无操作权限'
          break
        case 404:
          errorMessage = '请求的资源不存在'
          break
        case 500:
          errorMessage = data?.message || '服务器内部错误'
          break
        default:
          errorMessage = data?.message || `请求失败 (${status})`
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时，请稍后重试'
    } else if (error.message === 'Network Error') {
      errorMessage = '网络连接失败，请检查后端服务'
    }

    ElMessage.error(errorMessage)
    return Promise.reject(error)
  }
)

let redirecting = false
function handleUnauthorized() {
  ElMessage.error('登录已失效，请重新登录')
  localStorage.removeItem('token')
  localStorage.removeItem('tokenName')
  localStorage.removeItem('userInfo')
  if (!redirecting && !location.pathname.startsWith('/login')) {
    redirecting = true
    const redirect = encodeURIComponent(location.pathname + location.search)
    location.href = `/login?redirect=${redirect}`
  }
}

export default request
