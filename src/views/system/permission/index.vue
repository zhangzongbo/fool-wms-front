<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>权限管理</h2>
        <p class="page-subtitle">权限点主数据（菜单 / 按钮 / 接口），支撑角色授权与接口级鉴权</p>
      </div>
      <div class="header-actions">
        <el-button v-perm="'sys:perm:add'" type="primary" @click="openCreate"
          ><el-icon><Plus /></el-icon> 新增权限</el-button
        >
      </div>
    </div>

    <el-card class="search-card">
      <el-form :model="search" label-position="top" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="6"
            ><el-form-item label="权限编码/名称"
              ><el-input v-model="search.keyword" placeholder="编码或名称" clearable /></el-form-item
          ></el-col>
          <el-col :span="5"
            ><el-form-item label="类型"
              ><el-select v-model="search.permType" placeholder="全部" clearable style="width: 100%">
                <el-option v-for="(v, k) in PERM_TYPE" :key="k" :label="v.label" :value="k" /></el-select></el-form-item
          ></el-col>
          <el-col :span="6"
            ><el-form-item label=" ">
              <el-button @click="resetSearch"
                ><el-icon><Refresh /></el-icon>重置</el-button
              >
              <el-button @click="expandAll = !expandAll">{{ expandAll ? '收起' : '展开' }}全部</el-button>
            </el-form-item></el-col
          >
        </el-row>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table
        :key="tableKey"
        v-loading="loading"
        :data="displayData"
        row-key="id"
        border
        :default-expand-all="expandAll"
        :tree-props="{ children: 'children' }"
      >
        <el-table-column prop="permName" label="权限名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="permCode" label="权限编码" min-width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="110" align="center">
          <template #default="{ row }"
            ><el-tag :type="dictType(PERM_TYPE, row.permType)" effect="plain">{{
              dictLabel(PERM_TYPE, row.permType)
            }}</el-tag></template
          >
        </el-table-column>
        <el-table-column prop="remark" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }"
            ><el-button v-perm="'sys:perm:delete'" link type="danger" @click="handleDelete(row)"
              >删除</el-button
            ></template
          >
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" title="新增权限" width="480px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="权限名称" prop="permName"><el-input v-model="form.permName" /></el-form-item>
        <el-form-item label="权限编码" prop="permCode"
          ><el-input v-model="form.permCode" placeholder="如：sys:user:list"
        /></el-form-item>
        <el-form-item label="类型" prop="permType">
          <el-select v-model="form.permType" style="width: 100%">
            <el-option v-for="(v, k) in PERM_TYPE" :key="k" :label="v.label" :value="k"
          /></el-select>
        </el-form-item>
        <el-form-item label="上级权限">
          <el-select v-model="form.parentId" placeholder="顶级（无上级）" clearable style="width: 100%">
            <el-option v-for="p in rawList" :key="p.id" :label="`${p.permName} (${p.permCode})`" :value="p.id"
          /></el-select>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { permissionApi } from '@/api'
import { useDialogForm } from '@/composables/useDialogForm'
import { confirmAction } from '@/utils/confirm'
import { PERM_TYPE, dictLabel, dictType } from '@/constants/dict'

const loading = ref(false)
const rawList = ref([])
const search = reactive({ keyword: '', permType: '' })
const expandAll = ref(true)
const tableKey = computed(() => `${expandAll.value}-${filtering.value}`)

const filtering = computed(() => !!(search.keyword || search.permType))

// 无过滤 → 树形；有过滤 → 平铺列表
const treeData = computed(() => {
  const list = rawList.value.map((p) => ({ ...p, children: [] }))
  const map = Object.fromEntries(list.map((p) => [p.id, p]))
  const roots = []
  list.forEach((p) => {
    if (p.parentId && map[p.parentId]) map[p.parentId].children.push(p)
    else roots.push(p)
  })
  // 清理空 children，避免出现展开箭头
  const clean = (nodes) =>
    nodes.forEach((n) => {
      if (!n.children.length) delete n.children
      else clean(n.children)
    })
  clean(roots)
  return roots
})
const flatFiltered = computed(() =>
  rawList.value.filter((p) => {
    const kw = search.keyword.trim().toLowerCase()
    const matchKw = !kw || `${p.permName || ''}${p.permCode || ''}`.toLowerCase().includes(kw)
    const matchType = !search.permType || p.permType === search.permType
    return matchKw && matchType
  })
)
const displayData = computed(() => (filtering.value ? flatFiltered.value : treeData.value))

const loadData = async () => {
  loading.value = true
  try {
    rawList.value = (await permissionApi.list()) || []
  } catch (e) {
    // 错误提示已由请求拦截器处理
  } finally {
    loading.value = false
  }
}
const resetSearch = () => {
  search.keyword = ''
  search.permType = ''
}

// 权限点只支持新增 / 删除，不提供编辑
const { dialog, formRef, form, submitting, resetForm, openCreate, handleSubmit } = useDialogForm({
  defaultForm: () => ({ permName: '', permCode: '', permType: 'API', parentId: null, remark: '' }),
  create: (f) => permissionApi.add(f),
  onSuccess: loadData
})
const rules = {
  permName: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  permCode: [{ required: true, message: '请输入权限编码', trigger: 'blur' }],
  permType: [{ required: true, message: '请选择类型', trigger: 'change' }]
}
const handleDelete = (row) =>
  confirmAction(`确定删除权限「${row.permName}」吗？`, () => permissionApi.delete(row.id), {
    successText: '删除成功',
    onSuccess: loadData
  })

onMounted(loadData)
</script>
