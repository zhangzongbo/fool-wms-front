<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>库区管理</h2>
        <p class="page-subtitle">维护仓库下的功能库区划分（存储 / 拣货 / 收发货等）</p>
      </div>
      <div class="header-actions">
        <el-button v-perm="'sys:area:add'" type="primary" @click="openCreate"><el-icon><Plus /></el-icon> 新增库区</el-button>
      </div>
    </div>

    <el-card class="search-card">
      <el-form :model="search" label-position="top" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="所属仓库"><el-select v-model="search.warehouseId" placeholder="全部仓库" clearable style="width:100%">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.warehouseName" :value="w.id" /></el-select></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="库区名称/编码"><el-input v-model="search.keyword" placeholder="名称或编码" clearable /></el-form-item></el-col>
          <el-col :span="5"><el-form-item label="库区类型"><el-select v-model="search.areaType" placeholder="全部" clearable style="width:100%">
            <el-option v-for="t in AREA_TYPE" :key="t.value" :label="t.label" :value="t.value" /></el-select></el-form-item></el-col>
          <el-col :span="7"><el-form-item label=" "><el-button type="primary" @click="page.current=1"><el-icon><Search /></el-icon>查询</el-button>
            <el-button @click="resetSearch"><el-icon><Refresh /></el-icon>重置</el-button></el-form-item></el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="pagedList" stripe border>
        <el-table-column type="index" label="#" width="55" align="center" />
        <el-table-column prop="areaCode" label="库区编码" min-width="130" show-overflow-tooltip />
        <el-table-column prop="areaName" label="库区名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="所属仓库" min-width="160"><template #default="{ row }">{{ warehouseName(row.warehouseId) }}</template></el-table-column>
        <el-table-column label="库区类型" width="120" align="center">
          <template #default="{ row }"><el-tag effect="plain">{{ optionLabel(AREA_TYPE, row.areaType) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="areaDesc" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'sys:area:update'" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-perm="'sys:area:delete'" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination background layout="total, sizes, prev, pager, next, jumper"
        :total="filtered.length" :current-page="page.current" :page-size="page.size" :page-sizes="[10,20,50]"
        @current-change="(v)=>page.current=v" @size-change="(v)=>{page.size=v;page.current=1}" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑库区' : '新增库区'" width="560px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="所属仓库" prop="warehouseId">
          <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width:100%">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.warehouseName" :value="w.id" /></el-select>
        </el-form-item>
        <el-form-item label="库区编码" prop="areaCode"><el-input v-model="form.areaCode" :disabled="dialog.isEdit" /></el-form-item>
        <el-form-item label="库区名称" prop="areaName"><el-input v-model="form.areaName" /></el-form-item>
        <el-form-item label="库区类型" prop="areaType">
          <el-select v-model="form.areaType" placeholder="请选择" style="width:100%">
            <el-option v-for="t in AREA_TYPE" :key="t.value" :label="t.label" :value="t.value" /></el-select>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.areaDesc" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { warehouseAreaApi } from '@/api'
import { useLocalPage } from '@/composables/useLocalPage'
import { useDialogForm } from '@/composables/useDialogForm'
import { confirmAction } from '@/utils/confirm'
import { settledValue } from '@/utils'
import { useRefDataStore } from '@/stores/refData'
import { AREA_TYPE, optionLabel } from '@/constants/dict'

const refData = useRefDataStore()
const { warehouses } = storeToRefs(refData)
const { warehouseName } = refData
const loading = ref(false)
const rawList = ref([])
const search = reactive({ warehouseId: '', keyword: '', areaType: '' })

const filtered = computed(() => rawList.value.filter((a) => {
  const kw = search.keyword.trim().toLowerCase()
  const matchKw = !kw || `${a.areaName || ''}${a.areaCode || ''}`.toLowerCase().includes(kw)
  const matchWh = !search.warehouseId || a.warehouseId === search.warehouseId
  const matchType = !search.areaType || a.areaType === search.areaType
  return matchKw && matchWh && matchType
}))
const { page, pagedList } = useLocalPage(filtered, search)

const loadData = async () => {
  loading.value = true
  try {
    // 仓库下拉走参考数据缓存，加载失败时保留旧值
    const [areas] = await Promise.allSettled([warehouseAreaApi.list(), refData.ensure(['warehouses'])])
    rawList.value = settledValue(areas, rawList.value)
  } finally {
    loading.value = false
  }
}
const resetSearch = () => { search.warehouseId = ''; search.keyword = ''; search.areaType = ''; page.current = 1 }

// 库区变更后，其他页面缓存的库区下拉需重新拉取
const afterChange = () => { refData.invalidate('areas'); loadData() }

const { dialog, formRef, form, submitting, resetForm, openCreate, openEdit, handleSubmit } = useDialogForm({
  defaultForm: () => ({ id: null, warehouseId: '', areaCode: '', areaName: '', areaType: '', areaDesc: '' }),
  create: (f) => warehouseAreaApi.add(f),
  update: (f) => warehouseAreaApi.update(f.id, f),
  onSuccess: afterChange
})
const rules = {
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  areaCode: [{ required: true, message: '请输入库区编码', trigger: 'blur' }],
  areaName: [{ required: true, message: '请输入库区名称', trigger: 'blur' }],
  areaType: [{ required: true, message: '请选择库区类型', trigger: 'change' }]
}

const handleDelete = (row) => confirmAction(`确定删除库区「${row.areaName}」吗？`, () => warehouseAreaApi.delete(row.id), {
  successText: '删除成功',
  onSuccess: afterChange
})

onMounted(loadData)
</script>
