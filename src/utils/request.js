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
    // blob 直接返回；rawResponse 时返回完整响应（下载需要读取 Content-Disposition 与 Content-Type，见 utils/download）
    if (response.config.responseType === 'blob') {
      return response.config.rawResponse ? response : response.data
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

    showBizError(message || '请求失败')
    // 保留业务码与数据：如整单保存的行错误（code=400，data=[{ line, field, message }]）
    return Promise.reject(Object.assign(new Error(message || '请求失败'), { code, data }))
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

/**
 * 业务错误提示：较长的说明（如删除被拒绝时列出的多条原因）停留更久并可手动关闭
 */
function showBizError(message) {
  const long = message.length > 30
  ElMessage.error({ message, duration: long ? 8000 : 3000, showClose: long })
}

let redirecting = false
/**
 * 登录过期（超时、2 小时无操作、被踢下线）：清除本地登录态并带原路径跳转登录页（整页跳转，
 * 弹出的提示会随之消失，所以带 expired=1 由登录页显示「登录已过期」）。
 * 页面上往往同时有多个请求返回 401，只跳转一次
 */
export function handleUnauthorized() {
  localStorage.removeItem('token')
  localStorage.removeItem('tokenName')
  localStorage.removeItem('userInfo')
  if (redirecting || location.pathname.startsWith('/login')) return
  redirecting = true
  const redirect = encodeURIComponent(location.pathname + location.search)
  location.href = `/login?redirect=${redirect}&expired=1`
}

export default request
