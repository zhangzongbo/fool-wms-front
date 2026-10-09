<template>
  <el-container class="layout-container">
    <!-- 侧边导航 -->
    <el-aside :width="isCollapse ? '72px' : '236px'" class="sidebar">
      <div class="logo">
        <div class="logo-mark">W</div>
        <div v-if="!isCollapse" class="logo-info">
          <span class="logo-title">{{ systemName }}</span>
          <span class="logo-desc">Warehouse Management</span>
        </div>
      </div>

      <el-scrollbar class="sidebar-scroll">
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :unique-opened="true"
          :collapse-transition="false"
          class="sidebar-menu"
          background-color="transparent"
          text-color="#c7d2e6"
          active-text-color="#ffffff"
          router
        >
          <template v-for="item in menus" :key="item.path || item.title">
            <el-menu-item v-if="!item.children" :index="item.path" class="menu-item">
              <el-icon><component :is="item.icon" /></el-icon>
              <template #title>{{ item.title }}</template>
            </el-menu-item>

            <el-sub-menu v-else :index="item.title" class="menu-sub">
              <template #title>
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.title }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path" class="menu-item">
                {{ child.title }}
              </el-menu-item>
            </el-sub-menu>
          </template>
        </el-menu>
      </el-scrollbar>

      <div v-if="!isCollapse" class="sidebar-footer">
        <div class="footer-title">当前环境</div>
        <div class="footer-text">{{ environmentLabel }}</div>
        <div class="footer-sub">{{ systemName }} · v1.0</div>
      </div>
    </el-aside>

    <!-- 主内容区域 -->
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button class="collapse-btn" type="primary" link @click="toggleSidebar">
            <el-icon size="18">
              <Fold v-if="!isCollapse" />
              <Expand v-else />
            </el-icon>
          </el-button>
          <!-- 页面标题由各页 PageHeader 展示，顶栏只负责导航 -->
          <el-breadcrumb class="header-breadcrumb" separator="/">
            <el-breadcrumb-item v-for="item in breadcrumb" :key="item.title" :to="item.to">{{
              item.title
            }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-space :size="16" alignment="center">
            <el-tag class="env-tag" effect="plain" round>{{ environmentLabel }}</el-tag>
            <el-divider direction="vertical" />
            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-avatar :size="30" class="user-avatar">{{ avatarText }}</el-avatar>
                <span class="user-name">{{ displayName }}</span>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>
                    <div class="dropdown-user">
                      <strong>{{ displayName }}</strong>
                      <small>{{ (userInfo.roles || []).join('、') || '暂无角色' }}</small>
                    </div>
                  </el-dropdown-item>
                  <el-dropdown-item command="logout" divided>
                    <el-icon><SwitchButton /></el-icon> 退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-space>
        </div>
      </el-header>

      <el-main class="main-content">
        <div class="page-wrapper">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { Fold, Expand, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { MENU_GROUP_ICONS } from '@/router/menuGroups'
import { resolveBreadcrumb } from '@/router/breadcrumb'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)
const displayName = computed(() => userStore.displayName)
const avatarText = computed(() => displayName.value.charAt(0).toUpperCase())

const appStore = useAppStore()
// 折叠状态持久化到 localStorage（App.vue 启动时由 initAppSettings 恢复）
const isCollapse = computed(() => appStore.sidebarCollapsed)
const systemName = import.meta.env.VITE_APP_TITLE || 'Fool WMS'

// 菜单由路由表生成（Layout 子路由，按声明顺序），无权限的项隐藏，分组内无可见项时整组隐藏
const menus = computed(() => {
  const children = router.options.routes.find((r) => r.path === '/')?.children || []
  const result = []
  const groups = {}
  children.forEach(({ path, meta = {} }) => {
    if (!meta.title || !userStore.hasPermission(meta.perm)) return
    const item = { path: `/${path}`, title: meta.title, icon: meta.icon }
    if (!meta.group) {
      result.push(item)
      return
    }
    if (!groups[meta.group]) {
      groups[meta.group] = { title: meta.group, icon: MENU_GROUP_ICONS[meta.group], children: [] }
      result.push(groups[meta.group])
    }
    groups[meta.group].children.push(item)
  })
  return result
})

const resolveEnvironmentLabel = () => {
  const source = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'prod'
  const normalized = String(source).toLowerCase()
  if (normalized === 'prod' || normalized === 'production') return '生产环境'
  if (normalized === 'uat') return '预发布环境'
  if (normalized === 'test') return '测试环境'
  if (normalized === 'dev' || normalized === 'development') return '开发环境'
  return normalized.toUpperCase()
}
const environmentLabel = ref(resolveEnvironmentLabel())

const activeMenu = computed(() => route.path)
const breadcrumb = computed(() => resolveBreadcrumb(route))

const toggleSidebar = () => {
  appStore.toggleSidebar()
  appStore.saveSidebarState()
}

const handleCommand = async (command) => {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消'
    })
      .catch(() => 'cancel')
      .then(async (r) => {
        if (r === 'cancel') return
        await userStore.logout()
        ElMessage.success('已退出登录')
        router.replace('/login')
      })
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background-color: var(--brand-bg);
}

.sidebar {
  background: linear-gradient(180deg, #0f1d3a 0%, #14224a 60%, #182a52 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  transition: width 0.28s ease;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-mark {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff, #1765ad);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
}

.logo-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.logo-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}
.logo-desc {
  font-size: 11px;
  color: rgba(199, 210, 230, 0.7);
  letter-spacing: 0.5px;
}

.sidebar-scroll {
  flex: 1;
  padding: 12px 0;
}
.sidebar-menu {
  border-right: none;
}

.menu-item,
.menu-sub :deep(.el-sub-menu__title) {
  border-radius: 8px;
  margin: 3px 12px;
}
.menu-item {
  height: 44px;
  line-height: 44px;
}
.menu-item.is-active {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.28), rgba(64, 158, 255, 0.1));
  color: #fff !important;
  font-weight: 600;
}
.menu-item:hover,
.menu-sub :deep(.el-sub-menu__title):hover {
  background: rgba(64, 158, 255, 0.14);
  color: #fff;
}
.menu-item .el-icon,
.menu-sub .el-icon {
  font-size: 17px;
}

.sidebar-footer {
  padding: 16px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
}
.footer-title {
  font-size: 12px;
  color: rgba(199, 210, 230, 0.6);
  margin-bottom: 4px;
}
.footer-text {
  font-size: 13px;
  font-weight: 600;
  color: #77b5ff;
  margin-bottom: 2px;
}
.footer-sub {
  font-size: 11px;
  color: rgba(199, 210, 230, 0.55);
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  z-index: 10;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.collapse-btn {
  color: var(--brand-secondary);
}
.header-breadcrumb {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
}
.env-tag {
  border-color: rgba(23, 101, 173, 0.24);
  color: var(--brand-primary);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px 6px 6px;
  border-radius: 999px;
  transition: background-color 0.2s ease;
}
.user-info:hover {
  background: #f0f5fb;
}
.user-avatar {
  background: linear-gradient(135deg, #409eff, #1765ad);
  font-weight: 600;
}
.user-name {
  font-size: 14px;
  color: var(--brand-secondary);
  font-weight: 500;
}
.dropdown-user {
  display: flex;
  flex-direction: column;
  line-height: 1.5;
}
.dropdown-user small {
  color: var(--brand-text-secondary);
}

.main-content {
  background: transparent;
  padding: 0;
  height: calc(100vh - 60px);
  overflow: hidden;
}
.page-wrapper {
  height: 100%;
  overflow: auto;
  background: var(--brand-bg);
}
</style>
