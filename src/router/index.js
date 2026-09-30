import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Odometer, ChatDotRound, Box } from '@element-plus/icons-vue'
import Layout from '@/components/Layout.vue'
import { useUserStore } from '@/stores/user'

// Layout 子路由即侧边菜单（按声明顺序）：
// meta.title 菜单与页面标题；meta.icon 一级菜单图标；meta.group 归入的分组（图标见 menuGroups.js）；meta.perm 访问所需权限
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', public: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '仪表盘', icon: Odometer }
      },

      // 智能助手
      {
        path: 'agent-chat',
        name: 'AgentChat',
        component: () => import('@/views/agent-chat/index.vue'),
        meta: { title: '智能助手', icon: ChatDotRound }
      },

      // 基础数据
      {
        path: 'owner',
        name: 'Owner',
        component: () => import('@/views/owner/index.vue'),
        meta: { title: '货主管理', group: '基础数据', perm: 'sys:owner:list' }
      },
      {
        path: 'warehouse',
        name: 'Warehouse',
        component: () => import('@/views/warehouse/index.vue'),
        meta: { title: '仓库管理', group: '基础数据' }
      },
      {
        path: 'warehouse-area',
        name: 'WarehouseArea',
        component: () => import('@/views/warehouse-area/index.vue'),
        meta: { title: '库区管理', group: '基础数据' }
      },
      {
        path: 'location',
        name: 'Location',
        component: () => import('@/views/location/index.vue'),
        meta: { title: '库位管理', group: '基础数据' }
      },
      {
        path: 'materials',
        name: 'Materials',
        component: () => import('@/views/materials/index.vue'),
        meta: { title: '物料管理', group: '基础数据' }
      },

      // 库存
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/inventory/index.vue'),
        meta: { title: '库存查询', icon: Box, perm: 'sys:inventory:list' }
      },

      // 作业
      {
        path: 'inbound',
        name: 'Inbound',
        component: () => import('@/views/inbound/index.vue'),
        meta: { title: '入库管理', group: '仓储作业', perm: 'sys:inbound:list' }
      },
      {
        path: 'outbound',
        name: 'Outbound',
        component: () => import('@/views/outbound/index.vue'),
        meta: { title: '出库管理', group: '仓储作业', perm: 'sys:outbound:list' }
      },
      {
        path: 'check',
        name: 'Check',
        component: () => import('@/views/check/index.vue'),
        meta: { title: '盘点管理', group: '仓储作业', perm: 'sys:check:list' }
      },

      // 系统
      {
        path: 'system/user',
        name: 'SysUser',
        component: () => import('@/views/system/user/index.vue'),
        meta: { title: '用户管理', group: '系统管理', perm: 'sys:user:list' }
      },
      {
        path: 'system/role',
        name: 'SysRole',
        component: () => import('@/views/system/role/index.vue'),
        meta: { title: '角色管理', group: '系统管理', perm: 'sys:role:list' }
      },
      {
        path: 'system/permission',
        name: 'SysPermission',
        component: () => import('@/views/system/permission/index.vue'),
        meta: { title: '权限管理', group: '系统管理', perm: 'sys:perm:list' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const BASE_TITLE = import.meta.env.VITE_APP_TITLE || 'Fool WMS 仓储管理平台'

// meta.perm：访问页面所需的权限码（与后端列表接口的 @SaCheckPermission 一致；仓库/库区/库位/物料后端列表未设权限，前端也不限制）
router.beforeEach(async (to) => {
  document.title = to.meta?.title ? `${to.meta.title} · ${BASE_TITLE}` : BASE_TITLE
  const userStore = useUserStore()

  if (to.meta?.public) {
    return true
  }
  if (!userStore.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // 每次页面加载刷新一次权限，避免使用 localStorage 中过期的权限；失败（如 401）由请求拦截器处理
  if (!userStore.infoLoaded) {
    await userStore.fetchUserInfo().catch(() => {})
  }
  if (!userStore.hasPermission(to.meta?.perm)) {
    ElMessage.warning('暂无该页面的访问权限')
    return to.path === '/dashboard' ? true : '/dashboard'
  }
  return true
})

export default router
