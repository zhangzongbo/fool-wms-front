<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>库位管理</h2>
        <p class="page-subtitle">最小存储单元，隶属于仓库与库区，支撑库存精确定位</p>
      </div>
      <div class="header-actions">
        <el-button v-perm="'sys:location:add'" type="primary" @click="openCreate"><el-icon><Plus /></el-icon> 新增库位</el-button>
      </div>
    </div>

    <el-card class="search-card">
      <el-form :model="search" label-position="top" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="5"><el-form-item label="所属仓库"><el-select v-model="search.warehouseId" placeholder="全部仓库" clearable style="width:100%">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.warehouseName" :value="w.id" /></el-select></el-form-item></el-col>
          <el-col :span="5"><el-form-item label="所属库区"><el-select v-model="search.areaId" placeholder="全部库区" clearable style="width:100%">
            <el-option v-for="a in areas" :key="a.id" :label="a.areaName" :value="a.id" /></el-select></el-form-item></el-col>
          <el-col :span="5"><el-form-item label="库位名称/编码"><el-input v-model="search.keyword" placeholder="名称或编码" clearable /></el-form-item></el-col>
          <el-col :span="4"><el-form-item label="库位类型"><el-select v-model="search.locationType" placeholder="全部" clearable style="width:100%">
            <el-option v-for="t in LOCATION_TYPE" :key="t.value" :label="t.label" :value="t.value" /></el-select></el-form-item></el-col>
          <el-col :span="5"><el-form-item label=" "><el-button type="primary" @click="page.current=1"><el-icon><Search /></el-icon>查询</el-button>
            <el-button @click="resetSearch"><el-icon><Refresh /></el-icon>重置</el-button></el-form-item></el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="pagedList" stripe border>
        <el-table-column type="index" label="#" width="55" align="center" />
        <el-table-column prop="locationCode" label="库位编码" min-width="140" show-overflow-tooltip />
        <el-table-column prop="locationName" label="库位名称" min-width="140" show-overflow-tooltip />
        <el-table-column label="所属仓库" min-width="150"><template #default="{ row }">{{ warehouseName(row.warehouseId) }}</template></el-table-column>
        <el-table-column label="所属库区" min-width="140"><template #default="{ row }">{{ areaName(row.areaId) }}</template></el-table-column>
        <el-table-column label="库位类型" width="110" align="center">
          <template #default="{ row }"><el-tag effect="plain">{{ optionLabel(LOCATION_TYPE, row.locationType) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="locationDesc" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-perm="'sys:location:update'" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-perm="'sys:location:delete'" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination background layout="total, sizes, prev, pager, next, jumper"
        :total="filtered.length" :current-page="page.current" :page-size="page.size" :page-sizes="[10,20,50]"
        @current-change="(v)=>page.current=v" @size-change="(v)=>{page.size=v;page.current=1}" />
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑库位' : '新增库位'" width="560px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="所属仓库" prop="warehouseId">
          <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width:100%" @change="onWarehouseChange">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.warehouseName" :value="w.id" /></el-select>
        </el-form-item>
        <el-form-item label="所属库区" prop="areaId">
          <el-select v-model="form.areaId" placeholder="请选择库区" style="width:100%">
            <el-option v-for="a in formAreas" :key="a.id" :label="a.areaName" :value="a.id" /></el-select>
        </el-form-item>
        <el-form-item label="库位编码" prop="locationCode"><el-input v-model="form.locationCode" :disabled="dialog.isEdit" /></el-form-item>
        <el-form-item label="库位名称" prop="locationName"><el-input v-model="form.locationName" /></el-form-item>
        <el-form-item label="库位类型" prop="locationType">
          <el-select v-model="form.locationType" placeholder="请选择" style="width:100%">
            <el-option v-for="t in LOCATION_TYPE" :key="t.value" :label="t.label" :value="t.value" /></el-select>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.locationDesc" type="textarea" :rows="2" /></el-form-item>
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
import { locationApi } from '@/api'
import { useLocalPage } from '@/composables/useLocalPage'
import { useDialogForm } from '@/composables/useDialogForm'
import { confirmAction } from '@/utils/confirm'
import { settledValue } from '@/utils'
import { useRefDataStore } from '@/stores/refData'
import { LOCATION_TYPE, optionLabel } from '@/constants/dict'

const refData = useRefDataStore()
const { warehouses, areas } = storeToRefs(refData)
const { warehouseName, areaName } = refData
const loading = ref(false)
const rawList = ref([])
const search = reactive({ warehouseId: '', areaId: '', keyword: '', locationType: '' })

const filtered = computed(() => rawList.value.filter((l) => {
  const kw = search.keyword.trim().toLowerCase()
  const matchKw = !kw || `${l.locationName || ''}${l.locationCode || ''}`.toLowerCase().includes(kw)
  const matchWh = !search.warehouseId || l.warehouseId === search.warehouseId
  const matchArea = !search.areaId || l.areaId === search.areaId
  const matchType = !search.locationType || l.locationType === search.locationType
  return matchKw && matchWh && matchArea && matchType
}))
const { page, pagedList } = useLocalPage(filtered, search)

const loadData = async () => {
  loading.value = true
  try {
    // 仓库 / 库区下拉走参考数据缓存，加载失败时保留旧值
    const [locs] = await Promise.allSettled([locationApi.list(), refData.ensure(['warehouses', 'areas'])])
    rawList.value = settledValue(locs, rawList.value)
  } finally {
    loading.value = false
  }
}
const resetSearch = () => { Object.assign(search, { warehouseId: '', areaId: '', keyword: '', locationType: '' }); page.current = 1 }

// 库位变更后，其他页面缓存的库位下拉需重新拉取
const afterChange = () => { refData.invalidate('locations'); loadData() }

const { dialog, formRef, form, submitting, resetForm, openCreate, openEdit, handleSubmit } = useDialogForm({
  defaultForm: () => ({ id: null, warehouseId: '', areaId: '', locationCode: '', locationName: '', locationType: '', locationDesc: '' }),
  create: (f) => locationApi.add(f),
  update: (f) => locationApi.update(f.id, f),
  onSuccess: afterChange
})
const formAreas = computed(() => areas.value.filter((a) => !form.warehouseId || a.warehouseId === form.warehouseId))
const rules = {
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  areaId: [{ required: true, message: '请选择库区', trigger: 'change' }],
  locationCode: [{ required: true, message: '请输入库位编码', trigger: 'blur' }],
  locationName: [{ required: true, message: '请输入库位名称', trigger: 'blur' }],
  locationType: [{ required: true, message: '请选择库位类型', trigger: 'change' }]
}
const onWarehouseChange = () => { form.areaId = '' }

const handleDelete = (row) => confirmAction(`确定删除库位「${row.locationName}」吗？`, () => locationApi.delete(row.id), {
  successText: '删除成功',
  onSuccess: afterChange
})

onMounted(loadData)
</script>
