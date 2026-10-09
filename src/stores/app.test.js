import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore, SIDEBAR_AUTO_COLLAPSE_WIDTH } from './app'

const setWidth = (w) => {
  window.innerWidth = w
}

describe('useAppStore 侧栏折叠', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('未手动选择时按窗口宽度决定：窄于阈值折叠，否则展开', () => {
    const store = useAppStore()
    setWidth(SIDEBAR_AUTO_COLLAPSE_WIDTH - 1)
    store.initAppSettings()
    expect(store.sidebarCollapsed).toBe(true)
    expect(store.sidebarManual).toBe(false)

    store.autoCollapseByWidth(SIDEBAR_AUTO_COLLAPSE_WIDTH)
    expect(store.sidebarCollapsed).toBe(false)
  })

  it('手动切换后记住选择，自动折叠不再覆盖', () => {
    const store = useAppStore()
    setWidth(1280)
    store.initAppSettings()
    expect(store.sidebarCollapsed).toBe(true)

    store.toggleSidebar() // 手动展开
    expect(store.sidebarCollapsed).toBe(false)
    expect(localStorage.getItem('sidebarCollapsed')).toBe('false')
    store.autoCollapseByWidth(1100)
    expect(store.sidebarCollapsed).toBe(false)
  })

  it('启动时优先恢复已保存的手动选择', () => {
    localStorage.setItem('sidebarCollapsed', 'false')
    setWidth(1100)
    const store = useAppStore()
    store.initAppSettings()
    expect(store.sidebarCollapsed).toBe(false)
    expect(store.sidebarManual).toBe(true)
  })

  it('已保存值损坏时按未选择处理', () => {
    localStorage.setItem('sidebarCollapsed', '{bad')
    setWidth(1920)
    const store = useAppStore()
    store.initAppSettings()
    expect(store.sidebarCollapsed).toBe(false)
    expect(store.sidebarManual).toBe(false)
  })
})
