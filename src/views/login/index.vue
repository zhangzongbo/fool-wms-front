<template>
  <div class="login-page">
    <!-- 左侧品牌区 -->
    <div class="login-brand">
      <div class="brand-inner">
        <div class="brand-logo">
          <div class="brand-mark">W</div>
          <span>{{ systemName }}</span>
        </div>
        <h1 class="brand-title">仓储管理平台</h1>
        <p class="brand-desc">3PL 多货主 · 全流程作业闭环 · 数据隔离与权限治理</p>
        <ul class="brand-points">
          <li>
            <el-icon><Select /></el-icon> 入库 / 出库 / 盘点作业一体化
          </li>
          <li>
            <el-icon><Select /></el-icon> 多货主库存隔离与乐观锁并发控制
          </li>
          <li>
            <el-icon><Select /></el-icon> RBAC 细粒度权限与数据范围管控
          </li>
        </ul>
      </div>
      <div class="brand-glow glow-1"></div>
      <div class="brand-glow glow-2"></div>
    </div>

    <!-- 右侧登录表单 -->
    <div class="login-form-wrap">
      <div class="login-card">
        <h2 class="login-title">欢迎登录</h2>
        <p class="login-subtitle">请输入账号信息以进入管理后台</p>

        <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" clearable />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
              clearable
            />
          </el-form-item>
          <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin"> 登 录 </el-button>
        </el-form>

        <div v-if="isDev" class="login-tip">
          <el-icon><InfoFilled /></el-icon>
          默认管理员账号 <b>admin</b> / <b>admin123</b>
        </div>
      </div>
      <div class="login-copyright">© {{ year }} {{ systemName }} · Warehouse Management System</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Select, InfoFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)
const year = new Date().getFullYear()
const systemName = import.meta.env.VITE_APP_TITLE || 'Fool WMS'

// 默认账号仅在本地开发环境预填与提示，生产构建不暴露
const isDev = import.meta.env.DEV
const form = reactive(isDev ? { username: 'admin', password: 'admin123' } : { username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

// 只允许跳转到站内路径，防止 ?redirect=//evil.com 之类的开放重定向
const safeRedirect = (target) => {
  const path = Array.isArray(target) ? target[0] : target
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')
    ? path
    : '/dashboard'
}

const handleLogin = async () => {
  // 回车与按钮都会触发，登录中忽略重复提交
  if (loading.value) return
  if (!(await formRef.value.validate().catch(() => false))) return
  loading.value = true
  try {
    await userStore.login({ username: form.username, password: form.password })
    ElMessage.success('登录成功')
    router.replace(safeRedirect(route.query.redirect))
  } catch (e) {
    // 错误提示已由拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  width: 100vw;
  height: 100vh;
  min-width: 1024px;
  background: var(--brand-bg);
}

/* 品牌区 */
.login-brand {
  position: relative;
  flex: 1.15;
  overflow: hidden;
  background: linear-gradient(150deg, #0f1d3a 0%, #14224a 55%, #1c3a72 100%);
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0 8%;
}
.brand-inner {
  position: relative;
  z-index: 2;
  max-width: 460px;
}
.brand-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 40px;
}
.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #409eff, #1765ad);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(64, 158, 255, 0.45);
}
.brand-title {
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: 1px;
}
.brand-desc {
  font-size: 15px;
  color: rgba(203, 213, 245, 0.85);
  margin-bottom: 36px;
  line-height: 1.7;
}
.brand-points {
  list-style: none;
  padding: 0;
  margin: 0;
}
.brand-points li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: rgba(219, 228, 248, 0.92);
  padding: 10px 0;
}
.brand-points .el-icon {
  color: #67e0a3;
  font-size: 16px;
}

.brand-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
}
.glow-1 {
  width: 380px;
  height: 380px;
  background: #2f6fd6;
  top: -80px;
  right: -60px;
}
.glow-2 {
  width: 300px;
  height: 300px;
  background: #17408b;
  bottom: -100px;
  left: 20%;
}

/* 表单区 */
.login-form-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  position: relative;
}
.login-card {
  width: 360px;
}
.login-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--brand-secondary);
  margin-bottom: 8px;
}
.login-subtitle {
  font-size: 14px;
  color: var(--brand-text-secondary);
  margin-bottom: 32px;
}
.login-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  letter-spacing: 4px;
  margin-top: 8px;
  border-radius: 8px;
}
.login-tip {
  margin-top: 24px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f0f7ff;
  color: var(--brand-text-secondary);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.login-tip .el-icon {
  color: var(--brand-primary);
}
.login-tip b {
  color: var(--brand-primary);
}
.login-copyright {
  position: absolute;
  bottom: 28px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}

@media (max-width: 1024px) {
  .login-brand {
    display: none;
  }
}
</style>
