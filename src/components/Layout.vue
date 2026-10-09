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
          text-color="var(--wms-on-dark-text-regular)"
          active-text-color="var(--wms-on-dark-text)"
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
            <el-breadcrumb-item v-for="(item, i) in breadcrumb" :key="i" :to="item.to">{{
              item.title
            }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-space :size="16" alignment="center">
            <!-- 环境标签只在非生产环境显示，且全站只此一处 -->
            <template v-if="environmentLabel">
              <el-tag class="env-tag" effect="plain" round>{{ environmentLabel }}</el-tag>
              <el-divider direction="vertical" />
            </template>
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
          <!-- 按路由名区分实例：新建 / 编辑 / 详情页在不同单据间共用组件（OrderEdit / OrderDetail），换路由须重新挂载；
               同一路由内仅 query 变化（列表筛选）不重建 -->
          <router-view v-slot="{ Component, route: viewRoute }">
            <component :is="Component" :key="viewRoute.name" />
          </router-view>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { Fold, Expand, ArrowDown, SwitchButton } from '@element-plus/icons-vue'
import { MENU_GROUP_ICONS } from '@/router/menuGroups'
import { resolveBreadcrumb } from '@/router/breadcrumb'
import { listLocation } from '@/router/listMemory'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { userInfo } = storeToRefs(userStore)
const displayName = computed(() => userStore.displayName)
const avatarText = computed(() => displayName.value.charAt(0).toUpperCase())

const appStore = useAppStore()
// 折叠状态：手动选择持久化到 localStorage（App.vue 启动时由 initAppSettings 恢复）；
// 未手动选择时随窗口宽度自动折叠（窄于 1440）
const isCollapse = computed(() => appStore.sidebarCollapsed)
const onResize = () => appStore.autoCollapseByWidth(window.innerWidth)
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
const systemName = import.meta.env.VITE_APP_TITLE || 'Fool WMS'

// 菜单由路由表生成（Layout 子路由，按声明顺序），无权限的项隐藏，分组内无可见项时整组隐藏
const menus = computed(() => {
  const children = router.options.routes.find((r) => r.path === '/')?.children || []
  const result = []
  const groups = {}
  children.forEach(({ path, meta = {} }) => {
    // meta.hidden：详情 / 编辑等页面不进菜单
    if (!meta.title || meta.hidden || !userStore.hasPermission(meta.perm)) return
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

// 环境标签文案；生产环境返回空串（不显示）
const resolveEnvironmentLabel = () => {
  const source = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'prod'
  const normalized = String(source).toLowerCase()
  if (normalized === 'prod' || normalized === 'production') return ''
  if (normalized === 'uat') return '预发布环境'
  if (normalized === 'test') return '测试环境'
  if (normalized === 'dev' || normalized === 'development') return '开发环境'
  return normalized.toUpperCase()
}
const environmentLabel = resolveEnvironmentLabel()

// 详情 / 编辑等隐藏页高亮所属列表（meta.activeMenu）
const activeMenu = computed(() => route.meta?.activeMenu || route.path)
const breadcrumb = computed(() => resolveBreadcrumb(route, listLocation))

// 手动切换：记住选择，之后不再随窗口宽度自动折叠
const toggleSidebar = () => appStore.toggleSidebar()

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
  /* 高度随 #app（100%），出现横向滚动条时不会被裁掉底部 */
  height: 100%;
  background-color: var(--wms-bg);
}

.sidebar {
  background: linear-gradient(180deg, var(--wms-dark-bg-1) 0%, var(--wms-dark-bg-2) 60%, var(--wms-dark-bg-3) 100%);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--wms-on-dark-divider);
  transition: width 0.28s ease;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--wms-space-md);
  padding: 18px;
  border-bottom: 1px solid var(--wms-on-dark-divider);
}

.logo-mark {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: var(--wms-radius-lg);
  background: var(--wms-mark-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--wms-on-dark-text);
  font-size: 18px;
  font-weight: 800;
  box-shadow: var(--wms-mark-shadow);
}

.logo-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.logo-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--wms-on-dark-text);
}
.logo-desc {
  font-size: 11px;
  color: var(--wms-on-dark-text-muted);
  letter-spacing: 0.5px;
}

.sidebar-scroll {
  flex: 1;
  padding: var(--wms-space-md) 0;
}
.sidebar-menu {
  border-right: none;
}

.menu-item,
.menu-sub :deep(.el-sub-menu__title) {
  border-radius: var(--wms-radius-lg);
  margin: 3px var(--wms-space-md);
}
.menu-item {
  height: 44px;
  line-height: 44px;
}
.menu-item.is-active {
  background: linear-gradient(90deg, var(--wms-on-dark-active-bg), var(--wms-on-dark-active-bg-end));
  color: var(--wms-on-dark-text) !important;
  font-weight: 600;
}
.menu-item:hover,
.menu-sub :deep(.el-sub-menu__title):hover {
  background: var(--wms-on-dark-hover-bg);
  color: var(--wms-on-dark-text);
}
.menu-item .el-icon,
.menu-sub .el-icon {
  font-size: 17px;
}

.header {
  background: var(--wms-bg-card);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--wms-page-padding-x);
  box-shadow: var(--wms-shadow-header);
  border-bottom: 1px solid var(--wms-border-light);
  z-index: 10;
}
.header-left {
  display: flex;
  align-items: center;
  gap: var(--wms-space-lg);
}
.collapse-btn {
  color: var(--wms-color-secondary);
}
.header-breadcrumb {
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
}
.env-tag {
  border-color: var(--el-color-primary-light-7);
  color: var(--wms-color-primary);
}
.user-info {
  display: flex;
  align-items: center;
  gap: var(--wms-space-sm);
  cursor: pointer;
  padding: 6px 12px 6px 6px;
  border-radius: 999px;
  transition: background-color 0.2s ease;
}
.user-info:hover {
  background: var(--wms-bg-hover);
}
.user-avatar {
  background: var(--wms-mark-gradient);
  font-weight: 600;
}
.user-name {
  font-size: 14px;
  color: var(--wms-color-secondary);
  font-weight: 500;
}
.dropdown-user {
  display: flex;
  flex-direction: column;
  line-height: 1.5;
}
.dropdown-user small {
  color: var(--wms-text-secondary);
}

/* el-main 在纵向 el-container 中为 flex: 1，min-height: 0 让它不被内容撑高，滚动交给 .page-wrapper */
.main-content {
  background: transparent;
  padding: 0;
  min-height: 0;
  overflow: hidden;
}
.page-wrapper {
  height: 100%;
  overflow: auto;
  background: var(--wms-bg);
}
</style>
