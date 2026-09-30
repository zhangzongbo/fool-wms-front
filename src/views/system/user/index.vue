<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>用户管理</h2>
        <p class="page-subtitle">系统账号、角色分配与数据范围（货主）管控</p>
      </div>
      <div class="header-actions">
        <el-button v-perm="'sys:user:add'" type="primary" @click="openCreate"><el-icon><Plus /></el-icon> 新增用户</el-button>
      </div>
    </div>

    <el-card class="search-card">
      <el-form :model="search" label-position="top" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="用户名/姓名"><el-input v-model="search.keyword" placeholder="用户名或姓名" clearable /></el-form-item></el-col>
          <el-col :span="5"><el-form-item label="状态"><el-select v-model="search.status" placeholder="全部" clearable style="width:100%">
            <el-option v-for="s in ENABLE_STATUS" :key="s.value" :label="s.label" :value="s.value" /></el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label=" "><el-button type="primary" @click="page.current=1"><el-icon><Search /></el-icon>查询</el-button>
            <el-button @click="resetSearch"><el-icon><Refresh /></el-icon>重置</el-button></el-form-item></el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="pagedList" stripe border>
        <el-table-column type="index" label="#" width="55" align="center" />
        <el-table-column prop="username" label="用户名" min-width="130" show-overflow-tooltip />
        <el-table-column prop="realName" label="姓名" min-width="120" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" min-width="130" />
        <el-table-column label="数据范围" width="120" align="center">
          <template #default="{ row }"><el-tag :type="dictType(DATA_SCOPE, row.dataScope)" effect="light">{{ dictLabel(DATA_SCOPE, row.dataScope) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }"><el-tag :type="optionType(ENABLE_STATUS, row.status)">{{ optionLabel(ENABLE_STATUS, row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="330" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'sys:user:update'" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-perm="'sys:user:assign'" link type="primary" @click="openRoles(row)">角色</el-button>
            <el-button v-perm="'sys:user:assign'" link type="primary" @click="openOwners(row)">数据范围</el-button>
            <el-button v-perm="'sys:user:update'" link type="warning" @click="openResetPwd(row)">重置密码</el-button>
            <el-button v-perm="'sys:user:delete'" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination background layout="total, sizes, prev, pager, next, jumper"
        :total="filtered.length" :current-page="page.current" :page-size="page.size" :page-sizes="[10,20,50]"
        @current-change="(v)=>page.current=v" @size-change="(v)=>{page.size=v;page.current=1}" />
    </el-card>

    <!-- 新增/编辑 -->
    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑用户' : '新增用户'" width="520px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" :disabled="dialog.isEdit" /></el-form-item>
        <el-form-item v-if="!dialog.isEdit" label="初始密码" prop="password"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="姓名" prop="realName"><el-input v-model="form.realName" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分配角色 -->
    <el-dialog v-model="roleDialog.visible" title="分配角色" width="440px">
      <p class="dialog-sub">为「{{ roleDialog.user?.realName || roleDialog.user?.username }}」分配角色</p>
      <el-checkbox-group v-model="roleDialog.selected" v-loading="roleDialog.loading" class="check-group">
        <el-checkbox v-for="r in roles" :key="r.id" :value="r.id" border>{{ r.roleName }}</el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="roleDialog.visible=false">取消</el-button>
        <el-button type="primary" :loading="roleDialog.submitting" :disabled="roleDialog.loading" @click="submitRoles">保存</el-button>
      </template>
    </el-dialog>

    <!-- 数据范围 -->
    <el-dialog v-model="ownerDialog.visible" title="数据范围（货主）" width="480px">
      <p class="dialog-sub">为「{{ ownerDialog.user?.realName || ownerDialog.user?.username }}」设置可见货主范围</p>
      <el-radio-group v-model="ownerDialog.dataScope" class="scope-radio">
        <el-radio value="ALL">全部数据</el-radio>
        <el-radio value="CUSTOM">指定货主</el-radio>
      </el-radio-group>
      <el-checkbox-group v-if="ownerDialog.dataScope==='CUSTOM'" v-model="ownerDialog.selected" v-loading="ownerDialog.loading" class="check-group">
        <el-checkbox v-for="o in owners" :key="o.id" :value="o.id" border>{{ o.ownerName }}</el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="ownerDialog.visible=false">取消</el-button>
        <el-button type="primary" :loading="ownerDialog.submitting" :disabled="ownerDialog.loading" @click="submitOwners">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog v-model="pwdDialog.visible" title="重置密码" width="420px">
      <el-form ref="pwdFormRef" :model="pwdDialog" :rules="pwdRules" label-width="90px">
        <el-form-item label="新密码" prop="password"><el-input v-model="pwdDialog.password" type="password" show-password placeholder="8~64 位，须同时包含字母和数字" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialog.visible=false">取消</el-button>
        <el-button type="primary" :loading="pwdDialog.submitting" @click="submitResetPwd">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { userApi, roleApi } from '@/api'
import { useLocalPage } from '@/composables/useLocalPage'
import { useDialogForm } from '@/composables/useDialogForm'
import { confirmAction } from '@/utils/confirm'
import { settledValue } from '@/utils'
import { useRefDataStore } from '@/stores/refData'
import { ENABLE_STATUS, DATA_SCOPE, dictLabel, dictType, optionLabel, optionType } from '@/constants/dict'

const refData = useRefDataStore()
const { owners } = storeToRefs(refData)
const loading = ref(false)
const rawList = ref([])
const roles = ref([])
const search = reactive({ keyword: '', status: '' })

const filtered = computed(() => rawList.value.filter((u) => {
  const kw = search.keyword.trim().toLowerCase()
  const matchKw = !kw || `${u.username || ''}${u.realName || ''}`.toLowerCase().includes(kw)
  const matchStatus = search.status === '' || u.status === search.status
  return matchKw && matchStatus
}))
const { page, pagedList } = useLocalPage(filtered, search)

const loadData = async () => {
  loading.value = true
  try {
    // 角色列表不在参考数据缓存中，仍在本页加载；货主走缓存，失败时保留旧值
    const [users, rs] = await Promise.allSettled([userApi.list(), roleApi.list(), refData.ensure(['owners'])])
    rawList.value = settledValue(users, rawList.value)
    roles.value = settledValue(rs, roles.value)
  } finally {
    loading.value = false
  }
}
const resetSearch = () => { search.keyword = ''; search.status = ''; page.current = 1 }

const { dialog, formRef, form, submitting, resetForm, openCreate, openEdit, handleSubmit } = useDialogForm({
  defaultForm: () => ({ id: null, username: '', password: '', realName: '', phone: '', status: 1 }),
  create: (f) => userApi.add(f),
  update: (f) => userApi.update(f.id, f),
  onSuccess: loadData
})
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入初始密码', trigger: 'blur' }, { pattern: /^(?=.*[A-Za-z])(?=.*\d)\S{8,64}$/, message: '8~64 位，须同时包含字母和数字', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}
const handleDelete = (row) => confirmAction(`确定删除用户「${row.username}」吗？`, () => userApi.delete(row.id), {
  successText: '删除成功',
  onSuccess: loadData
})

// 角色
const roleDialog = reactive({ visible: false, submitting: false, loading: false, user: null, selected: [] })
const openRoles = async (row) => {
  roleDialog.user = row; roleDialog.selected = []; roleDialog.visible = true; roleDialog.loading = true
  try {
    const ids = (await userApi.getRoleIds(row.id)) || []
    if (roleDialog.user !== row) return // 已切换到其他用户，丢弃过期响应
    roleDialog.selected = ids
    roleDialog.loading = false
  } catch (e) {
    // 回显失败时关闭弹窗，避免以空集覆盖已有角色
    if (roleDialog.user === row) { roleDialog.visible = false; roleDialog.loading = false }
  }
}
const submitRoles = async () => {
  roleDialog.submitting = true
  try { await userApi.assignRoles(roleDialog.user.id, roleDialog.selected); ElMessage.success('角色已保存'); roleDialog.visible = false }
  finally { roleDialog.submitting = false }
}

// 数据范围
const ownerDialog = reactive({ visible: false, submitting: false, loading: false, user: null, dataScope: 'CUSTOM', selected: [] })
const openOwners = async (row) => {
  ownerDialog.user = row; ownerDialog.dataScope = row.dataScope || 'CUSTOM'; ownerDialog.selected = []; ownerDialog.visible = true; ownerDialog.loading = true
  try {
    const ids = (await userApi.getOwnerIds(row.id)) || []
    if (ownerDialog.user !== row) return // 已切换到其他用户，丢弃过期响应
    ownerDialog.selected = ids
    ownerDialog.loading = false
  } catch (e) {
    // 回显失败时关闭弹窗，避免以空集覆盖已有货主
    if (ownerDialog.user === row) { ownerDialog.visible = false; ownerDialog.loading = false }
  }
}
const submitOwners = async () => {
  ownerDialog.submitting = true
  try {
    const ownerIds = ownerDialog.dataScope === 'CUSTOM' ? ownerDialog.selected : []
    await userApi.assignOwners(ownerDialog.user.id, ownerDialog.dataScope, ownerIds)
    ElMessage.success('数据范围已保存'); ownerDialog.visible = false; loadData()
  } finally { ownerDialog.submitting = false }
}

// 重置密码
const pwdDialog = reactive({ visible: false, submitting: false, user: null, password: '' })
const pwdFormRef = ref()
const pwdRules = { password: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { pattern: /^(?=.*[A-Za-z])(?=.*\d)\S{8,64}$/, message: '8~64 位，须同时包含字母和数字', trigger: 'blur' }] }
const openResetPwd = (row) => {
  pwdDialog.user = row
  pwdDialog.password = ''
  // 清掉上次打开残留的校验提示
  pwdFormRef.value?.clearValidate()
  pwdDialog.visible = true
}
const submitResetPwd = async () => {
  if (!(await pwdFormRef.value.validate().catch(() => false))) return
  pwdDialog.submitting = true
  try {
    await userApi.resetPassword(pwdDialog.user.id, pwdDialog.password)
    ElMessage.success('密码已重置')
    pwdDialog.visible = false
  } catch (e) {
    // 接口错误提示已由请求拦截器统一弹出
  } finally {
    pwdDialog.submitting = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.dialog-sub { color: var(--brand-text-secondary); font-size: 13px; margin-bottom: 16px; }
.check-group { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.check-group :deep(.el-checkbox) { margin-right: 0; }
.scope-radio { margin-bottom: 8px; }
</style>
