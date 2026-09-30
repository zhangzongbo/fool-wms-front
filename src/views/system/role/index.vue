<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>角色管理</h2>
        <p class="page-subtitle">定义角色并授予权限点，用户通过角色获得访问能力</p>
      </div>
      <div class="header-actions">
        <el-button v-perm="'sys:role:add'" type="primary" @click="openCreate"><el-icon><Plus /></el-icon> 新增角色</el-button>
      </div>
    </div>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="rawList" stripe border>
        <el-table-column type="index" label="#" width="55" align="center" />
        <el-table-column prop="roleCode" label="角色编码" min-width="160" show-overflow-tooltip />
        <el-table-column prop="roleName" label="角色名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="remark" label="描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'sys:role:update'" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-perm="'sys:role:assign'" link type="primary" @click="openPerms(row)">分配权限</el-button>
            <el-button v-perm="'sys:role:delete'" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑角色' : '新增角色'" width="480px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="角色编码" prop="roleCode"><el-input v-model="form.roleCode" :disabled="dialog.isEdit" placeholder="如：WAREHOUSE_ADMIN" /></el-form-item>
        <el-form-item label="角色名称" prop="roleName"><el-input v-model="form.roleName" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分配权限 -->
    <el-dialog v-model="permDialog.visible" title="分配权限" width="560px">
      <p class="dialog-sub">为「{{ permDialog.role?.roleName }}」勾选权限点</p>
      <el-scrollbar v-loading="permDialog.loading" max-height="420px">
        <el-tree
          ref="treeRef"
          :data="permTree"
          show-checkbox
          node-key="id"
          :props="{ label: labelOf, children: 'children' }"
          default-expand-all
        />
      </el-scrollbar>
      <template #footer>
        <el-button @click="permDialog.visible=false">取消</el-button>
        <el-button type="primary" :loading="permDialog.submitting" :disabled="permDialog.loading" @click="submitPerms">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { roleApi, permissionApi } from '@/api'
import { useDialogForm } from '@/composables/useDialogForm'
import { confirmAction } from '@/utils/confirm'

const loading = ref(false)
const rawList = ref([])
const permissions = ref([])

const loadData = async () => {
  loading.value = true
  try {
    const [rs, ps] = await Promise.all([roleApi.list(), permissionApi.list().catch(() => [])])
    rawList.value = rs || []
    permissions.value = ps || []
  } catch (e) {
    // 错误提示已由请求拦截器处理
  } finally {
    loading.value = false
  }
}

const { dialog, formRef, form, submitting, resetForm, openCreate, openEdit, handleSubmit } = useDialogForm({
  defaultForm: () => ({ id: null, roleCode: '', roleName: '', remark: '' }),
  create: (f) => roleApi.add(f),
  update: (f) => roleApi.update(f.id, f),
  onSuccess: loadData
})
const rules = {
  roleCode: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
}
const handleDelete = (row) => confirmAction(`确定删除角色「${row.roleName}」吗？`, () => roleApi.delete(row.id), {
  successText: '删除成功',
  onSuccess: loadData
})

// 权限树
const labelOf = (data) => `${data.permName || data.permCode}`
const permTree = computed(() => {
  const list = permissions.value.map((p) => ({ ...p }))
  const map = Object.fromEntries(list.map((p) => [p.id, { ...p, children: [] }]))
  const roots = []
  list.forEach((p) => {
    const node = map[p.id]
    if (p.parentId && map[p.parentId]) map[p.parentId].children.push(node)
    else roots.push(node)
  })
  return roots
})

const treeRef = ref()
const permDialog = reactive({ visible: false, submitting: false, loading: false, role: null })
// 保存时会带上半选父节点，回显只能设叶子节点：父节点 id 传给 setCheckedKeys 会把其下全部子节点连带勾上
const leafIds = computed(() => new Set(permissions.value.filter((p) => !permissions.value.some((c) => c.parentId === p.id)).map((p) => p.id)))
const openPerms = async (row) => {
  permDialog.role = row
  permDialog.visible = true
  permDialog.loading = true
  await nextTick()
  treeRef.value.setCheckedKeys([])
  try {
    const ids = (await roleApi.getPermissionIds(row.id)) || []
    if (permDialog.role !== row) return // 已切换到其他角色，丢弃过期响应
    treeRef.value.setCheckedKeys(ids.filter((id) => leafIds.value.has(id)))
    permDialog.loading = false
  } catch (e) {
    // 回显失败时关闭弹窗，避免以空集覆盖已有权限
    if (permDialog.role === row) { permDialog.visible = false; permDialog.loading = false }
  }
}
const submitPerms = async () => {
  permDialog.submitting = true
  try {
    const ids = [...treeRef.value.getCheckedKeys(), ...treeRef.value.getHalfCheckedKeys()]
    await roleApi.assignPermissions(permDialog.role.id, ids)
    ElMessage.success('权限已保存'); permDialog.visible = false
  } finally { permDialog.submitting = false }
}

onMounted(loadData)
</script>

<style scoped>
.dialog-sub { color: var(--brand-text-secondary); font-size: 13px; margin-bottom: 12px; }
</style>
