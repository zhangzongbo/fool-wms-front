import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'
import { useRefDataStore } from './refData'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || 'null') || {
    userId: null,
    username: '',
    realName: '',
    roles: [],
    permissions: []
  })

  // 本次页面加载是否已从服务端刷新过用户信息（localStorage 中的权限可能已过期）
  const infoLoaded = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const displayName = computed(() => userInfo.value.realName || userInfo.value.username || '用户')

  // 登录
  const login = async (form) => {
    const res = await authApi.login(form)
    // res: { tokenName, tokenValue, userId, username }
    token.value = res.tokenValue
    localStorage.setItem('token', res.tokenValue)
    localStorage.setItem('tokenName', res.tokenName || 'satoken')
    // 参考数据（如货主）受数据范围约束，换账号后需重新拉取
    useRefDataStore().reset()
    await fetchUserInfo()
    return res
  }

  // 拉取当前用户信息
  const fetchUserInfo = async () => {
    const res = await authApi.me()
    userInfo.value = res
    infoLoaded.value = true
    localStorage.setItem('userInfo', JSON.stringify(res))
    return res
  }

  // 登出
  const logout = async () => {
    try {
      await authApi.logout()
    } catch (e) {
      // 忽略登出接口异常，前端仍需清理
    }
    reset()
  }

  const reset = () => {
    token.value = ''
    infoLoaded.value = false
    useRefDataStore().reset()
    userInfo.value = { userId: null, username: '', realName: '', roles: [], permissions: [] }
    localStorage.removeItem('token')
    localStorage.removeItem('tokenName')
    localStorage.removeItem('userInfo')
  }

  const hasPermission = (perm) => {
    if (!perm) return true
    const perms = userInfo.value.permissions || []
    return perms.includes('*') || perms.includes(perm)
  }

  const hasRole = (role) => (userInfo.value.roles || []).includes(role)

  return {
    token,
    userInfo,
    infoLoaded,
    isLoggedIn,
    displayName,
    login,
    logout,
    reset,
    fetchUserInfo,
    hasPermission,
    hasRole
  }
})
