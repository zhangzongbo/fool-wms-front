<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>盘点管理</h2>
        <p class="page-subtitle">盘点单全流程：草稿 → 盘点中 → 已盘点 → 过账（按差异调整库存）</p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData(true)"
          ><el-icon><Refresh /></el-icon> 刷新</el-button
        >
        <el-button v-perm="'sys:check:add'" type="primary" @click="openCreate"
          ><el-icon><Plus /></el-icon> 新增盘点单</el-button
        >
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6"
        ><div class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ rawList.length }}</div>
            <div class="stat-label">盘点单总数</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card warning">
          <div class="stat-content">
            <div class="stat-value">{{ countStatus('CHECKING') }}</div>
            <div class="stat-label">盘点中</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ countStatus('COUNTED') }}</div>
            <div class="stat-label">待过账</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card success">
          <div class="stat-content">
            <div class="stat-value">{{ countStatus('ADJUSTED') + countStatus('FINISHED') }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div></el-col
      >
    </el-row>

    <el-card class="search-card">
      <el-form :model="search" label-position="top" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="6"
            ><el-form-item label="盘点单号"
              ><el-input v-model="search.keyword" placeholder="盘点单号" clearable /></el-form-item
          ></el-col>
          <el-col :span="5"
            ><el-form-item label="仓库"
              ><el-select v-model="search.warehouseId" placeholder="全部" clearable style="width: 100%">
                <el-option
                  v-for="w in warehouses"
                  :key="w.id"
                  :label="w.warehouseName"
                  :value="w.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="5"
            ><el-form-item label="状态"
              ><el-select v-model="search.status" placeholder="全部" clearable style="width: 100%">
                <el-option
                  v-for="(v, k) in CHECK_STATUS"
                  :key="k"
                  :label="v.label"
                  :value="k" /></el-select></el-form-item
          ></el-col>
          <el-col :span="8"
            ><el-form-item label=" "
              ><el-button type="primary" @click="page.current = 1"
                ><el-icon><Search /></el-icon>查询</el-button
              >
              <el-button @click="resetSearch"
                ><el-icon><Refresh /></el-icon>重置</el-button
              ></el-form-item
            ></el-col
          >
        </el-row>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="pagedList" stripe border>
        <el-table-column type="index" label="#" width="55" align="center" fixed="left" />
        <el-table-column prop="checkCode" label="盘点单号" min-width="160" fixed="left" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center" fixed="left">
          <template #default="{ row }"
            ><el-tag :type="dictType(CHECK_STATUS, row.status)">{{
              dictLabel(CHECK_STATUS, row.status)
            }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="货主" min-width="130" show-overflow-tooltip
          ><template #default="{ row }">{{ ownerName(row.ownerId) }}</template></el-table-column
        >
        <el-table-column label="仓库" min-width="150"
          ><template #default="{ row }">{{ warehouseName(row.warehouseId) }}</template></el-table-column
        >
        <el-table-column label="盘点类型" width="110" align="center"
          ><template #default="{ row }">{{ optionLabel(CHECK_TYPE, row.checkType) }}</template></el-table-column
        >
        <el-table-column label="已盘/明细" width="110" align="right"
          ><template #default="{ row }">{{ row.countedCount }} / {{ row.itemCount }}</template></el-table-column
        >
        <el-table-column label="创建人" min-width="100" show-overflow-tooltip
          ><template #default="{ row }">{{ row.createByName || '-' }}</template></el-table-column
        >
        <el-table-column label="创建时间" width="160" align="center"
          ><template #default="{ row }">{{ formatDateTime(row.createTime) }}</template></el-table-column
        >
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="320" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">明细</el-button>
            <el-button
              v-if="row.status === 'DRAFT'"
              v-perm="'sys:check:update'"
              link
              type="primary"
              @click="openEdit(row)"
              >编辑</el-button
            >
            <el-button
              v-if="row.status === 'DRAFT'"
              v-perm="'sys:check:status'"
              link
              type="success"
              @click="changeStatus(row, 'CHECKING', '开始盘点')"
              >开始盘点</el-button
            >
            <el-button
              v-if="row.status === 'CHECKING'"
              v-perm="'sys:check:status'"
              link
              type="success"
              @click="changeStatus(row, 'COUNTED', '完成盘点')"
              >完成盘点</el-button
            >
            <el-button
              v-if="row.status === 'COUNTED'"
              v-perm="'sys:check:post'"
              link
              type="success"
              @click="handlePost(row)"
              >过账</el-button
            >
            <el-button
              v-if="canCancel(row.status)"
              v-perm="'sys:check:status'"
              link
              type="warning"
              @click="changeStatus(row, 'CANCELLED', '取消')"
              >取消</el-button
            >
            <el-button
              v-if="row.status === 'DRAFT'"
              v-perm="'sys:check:delete'"
              link
              type="danger"
              @click="handleDelete(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="filtered.length"
        :current-page="page.current"
        :page-size="page.size"
        :page-sizes="[10, 20, 50]"
        @current-change="(v) => (page.current = v)"
        @size-change="
          (v) => {
            page.size = v
            page.current = 1
          }
        "
      />
    </el-card>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.isEdit ? '编辑盘点单' : '新增盘点单'"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="盘点单号" prop="checkCode"
          ><el-input v-model="form.checkCode" :disabled="dialog.isEdit"
        /></el-form-item>
        <el-form-item label="仓库" prop="warehouseId">
          <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width: 100%" @change="form.areaId = ''">
            <el-option v-for="w in warehouses" :key="w.id" :label="w.warehouseName" :value="w.id"
          /></el-select>
        </el-form-item>
        <el-form-item label="货主" prop="ownerId">
          <el-select
            v-model="form.ownerId"
            placeholder="请选择货主"
            filterable
            style="width: 100%"
            :disabled="dialog.ownerLocked"
          >
            <el-option v-for="o in owners" :key="o.id" :label="o.ownerName" :value="o.id"
          /></el-select>
        </el-form-item>
        <el-form-item label="库区">
          <el-select v-model="form.areaId" placeholder="不限（整仓盘点）" clearable style="width: 100%">
            <el-option v-for="a in formAreas" :key="a.id" :label="a.areaName" :value="a.id"
          /></el-select>
        </el-form-item>
        <el-form-item label="盘点类型" prop="checkType">
          <el-select v-model="form.checkType" placeholder="请选择" style="width: 100%">
            <el-option v-for="t in CHECK_TYPE" :key="t.value" :label="t.label" :value="t.value"
          /></el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detail.visible" :title="`盘点明细 · ${detail.order?.checkCode || ''}`" size="58%">
      <div v-if="detail.order" class="detail-head">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="盘点单号">{{ detail.order.checkCode }}</el-descriptions-item>
          <el-descriptions-item label="状态"
            ><el-tag :type="dictType(CHECK_STATUS, detail.order.status)">{{
              dictLabel(CHECK_STATUS, detail.order.status)
            }}</el-tag></el-descriptions-item
          >
          <el-descriptions-item label="仓库">{{ warehouseName(detail.order.warehouseId) }}</el-descriptions-item>
          <el-descriptions-item label="货主">{{ ownerName(detail.order.ownerId) }}</el-descriptions-item>
          <el-descriptions-item label="盘点类型">{{
            optionLabel(CHECK_TYPE, detail.order.checkType)
          }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detail.order.createByName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detail.order.createTime) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <div class="detail-toolbar">
        <span class="detail-title">盘点明细（{{ detailList.length }}）</span>
        <el-button
          v-if="detail.order?.status === 'DRAFT'"
          v-perm="'sys:check:update'"
          type="primary"
          size="small"
          @click="openDetailForm()"
          ><el-icon><Plus /></el-icon> 添加明细</el-button
        >
      </div>
      <el-table v-loading="detail.loading" :data="detailList" border size="small">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="productCode" label="商品编码" min-width="110" show-overflow-tooltip />
        <el-table-column label="库位" min-width="100" align="center" show-overflow-tooltip
          ><template #default="{ row }">{{ locationCode(row.locationId) }}</template></el-table-column
        >
        <el-table-column prop="batchNo" label="批次" min-width="90" show-overflow-tooltip />
        <el-table-column prop="systemQty" label="账面量" width="90" align="right">
          <!-- 草稿期账面量尚未快照（库列默认 0，无意义），开始盘点后才生成 -->
          <template #default="{ row }"
            ><span :class="{ 'text-normal': detail.order?.status === 'DRAFT' }">{{
              detail.order?.status === 'DRAFT' ? '待快照' : row.systemQty
            }}</span></template
          >
        </el-table-column>
        <el-table-column prop="actualQty" label="实盘量" width="90" align="right">
          <template #default="{ row }"
            ><span :class="{ 'text-normal': row.actualQty == null }">{{ row.actualQty ?? '未盘' }}</span></template
          >
        </el-table-column>
        <el-table-column label="差异" width="90" align="right">
          <template #default="{ row }"
            ><span :class="diffClass(row)">{{ diffText(row) }}</span></template
          >
        </el-table-column>
        <el-table-column v-if="detailEditable" label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button v-perm="'sys:check:update'" link type="primary" @click="openDetailForm(row)">编辑</el-button>
            <el-button
              v-if="detail.order?.status === 'DRAFT'"
              v-perm="'sys:check:update'"
              link
              type="danger"
              @click="deleteDetail(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <el-dialog
      v-model="detailForm.visible"
      :title="detailForm.isEdit ? '编辑明细' : '添加明细'"
      width="560px"
      append-to-body
      @close="resetDetailForm"
    >
      <el-form ref="detailFormRef" :model="dForm" :rules="detailRules" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="24"
            ><el-form-item label="物料" prop="skuId"
              ><el-select
                v-model="dForm.skuId"
                placeholder="选择物料（编码 / 名称）"
                filterable
                style="width: 100%"
                :disabled="detailCounting"
                @change="onMaterialChange"
              >
                <el-option
                  v-for="m in materials"
                  :key="m.id"
                  :label="`${m.materialCode} ${m.materialName}`"
                  :value="m.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="商品编码" prop="productCode"
              ><el-input v-model="dForm.productCode" disabled /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="库位" prop="locationId"
              ><el-select
                v-model="dForm.locationId"
                placeholder="选择库位"
                clearable
                filterable
                style="width: 100%"
                :disabled="detailCounting"
              >
                <el-option
                  v-for="l in locations"
                  :key="l.id"
                  :label="`${l.locationCode} (${l.locationName})`"
                  :value="l.id" /></el-select></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="批次号"><el-input v-model="dForm.batchNo" :disabled="detailCounting" /></el-form-item
          ></el-col>
          <!-- 账面量由"开始盘点"时系统快照（可用+冻结）生成；实盘量仅盘点中录入 -->
          <el-col v-if="detailCounting" :span="12"
            ><el-form-item label="账面量"
              ><el-input-number v-model="dForm.systemQty" style="width: 100%" disabled /></el-form-item
          ></el-col>
          <el-col v-if="detailCounting" :span="12"
            ><el-form-item label="实盘量"
              ><el-input-number
                v-model="dForm.actualQty"
                :min="0"
                style="width: 100%"
                placeholder="留空表示未盘" /></el-form-item
          ></el-col>
          <el-col :span="24"
            ><el-form-item label="备注"><el-input v-model="dForm.remark" /></el-form-item
          ></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="detailForm.visible = false">取消</el-button>
        <el-button type="primary" :loading="detailSubmitting" @click="submitDetail">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { checkApi, checkDetailApi } from '@/api'
import { useLocalPage } from '@/composables/useLocalPage'
import { useDialogForm } from '@/composables/useDialogForm'
import { useOrderDetail } from '@/composables/useOrderDetail'
import { confirmAction } from '@/utils/confirm'
import { settledValue, formatDateTime } from '@/utils'
import { useRefDataStore } from '@/stores/refData'
import { CHECK_STATUS, CHECK_TYPE, dictLabel, dictType, optionLabel } from '@/constants/dict'

const refData = useRefDataStore()
const { owners, warehouses, areas, locations, materials } = storeToRefs(refData)
const { ownerName, warehouseName, locationCode } = refData
const loading = ref(false)
const rawList = ref([])
const search = reactive({ keyword: '', warehouseId: '', status: '' })

const canCancel = (s) => ['DRAFT', 'CHECKING'].includes(s)
const countStatus = (s) => rawList.value.filter((o) => o.status === s).length

const diffVal = (row) => (row.actualQty == null ? null : Number(row.actualQty) - Number(row.systemQty ?? 0))
const diffText = (row) => {
  const d = diffVal(row)
  return d == null ? '-' : d > 0 ? `+${d}` : d
}
const diffClass = (row) => {
  const d = diffVal(row)
  if (d == null || d === 0) return 'text-normal'
  return d > 0 ? 'text-success' : 'text-danger'
}

const filtered = computed(() =>
  rawList.value.filter((o) => {
    const kw = search.keyword.trim().toLowerCase()
    const matchKw = !kw || (o.checkCode || '').toLowerCase().includes(kw)
    const matchWh = !search.warehouseId || o.warehouseId === search.warehouseId
    const matchStatus = !search.status || o.status === search.status
    return matchKw && matchWh && matchStatus
  })
)
const { page, pagedList } = useLocalPage(filtered, search)

const { detail, detailList, openDetail, syncDetail } = useOrderDetail((id) => checkDetailApi.list(id))
const detailEditable = computed(() => ['DRAFT', 'CHECKING'].includes(detail.order?.status))
// 盘点中仅可录入实盘量 / 备注，增删明细仅草稿
const detailCounting = computed(() => detail.order?.status === 'CHECKING')

// force：刷新按钮强制重拉参考数据；操作后刷新仅重拉单据
const loadData = async (force = false) => {
  loading.value = true
  try {
    const [orders] = await Promise.allSettled([
      checkApi.list(),
      refData.ensure(['owners', 'materials', 'warehouses', 'areas', 'locations'], { force })
    ])
    rawList.value = settledValue(orders, rawList.value)
    syncDetail(rawList.value)
  } finally {
    loading.value = false
  }
}
const resetSearch = () => {
  Object.assign(search, { keyword: '', warehouseId: '', status: '' })
  page.current = 1
}

const genCode = () =>
  'CK' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + Math.floor(Math.random() * 900 + 100)
const {
  dialog,
  formRef,
  form,
  submitting,
  resetForm,
  openCreate: createOrder,
  openEdit: editOrder,
  handleSubmit
} = useDialogForm({
  defaultForm: () => ({
    id: null,
    ownerId: null,
    checkCode: genCode(),
    warehouseId: '',
    areaId: '',
    checkType: 'FULL',
    remark: '',
    status: 'DRAFT'
  }),
  create: (f) => checkApi.add(f),
  update: (f) => checkApi.update(f.id, f),
  onSuccess: () => loadData(),
  createText: '创建成功'
})
// 编辑时已有货主不可改
const openCreate = () => {
  dialog.ownerLocked = false
  createOrder()
}
const openEdit = (row) => {
  dialog.ownerLocked = row.ownerId != null
  editOrder(row)
}
const formAreas = computed(() => areas.value.filter((a) => !form.warehouseId || a.warehouseId === form.warehouseId))
const rules = {
  checkCode: [{ required: true, message: '请输入盘点单号', trigger: 'blur' }],
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  ownerId: [{ required: true, message: '请选择货主', trigger: 'change' }],
  checkType: [{ required: true, message: '请选择盘点类型', trigger: 'change' }]
}

const changeStatus = (row, status, label) =>
  confirmAction(`确定${label}盘点单「${row.checkCode}」吗？`, () => checkApi.changeStatus(row.id, status), {
    successText: `${label}成功`,
    onSuccess: () => loadData()
  })
const handlePost = (row) =>
  confirmAction('过账将按盘点差异调整库存（盘盈增加 / 盘亏扣减），确定继续？', () => checkApi.post(row.id), {
    title: '盘点过账',
    confirmButtonText: '过账',
    successText: '过账成功',
    onSuccess: () => loadData()
  })
const handleDelete = (row) =>
  confirmAction(`确定删除盘点单「${row.checkCode}」吗？`, () => checkApi.delete(row.id), {
    successText: '删除成功',
    onSuccess: () => loadData()
  })

// 账面量/差异由后端生成与计算，不提交；盘点中后端只采纳实盘量与备注（维度字段仍需带上以通过 DTO 校验）
const toDetailPayload = (f) => {
  const { systemQty, actualQty, diffQty, ...draftFields } = f
  return detailCounting.value ? { ...draftFields, actualQty } : draftFields
}
const {
  dialog: detailForm,
  formRef: detailFormRef,
  form: dForm,
  submitting: detailSubmitting,
  resetForm: resetDetailForm,
  openCreate: createDetail,
  openEdit: editDetail,
  handleSubmit: submitDetail
} = useDialogForm({
  defaultForm: () => ({
    id: null,
    skuId: null,
    checkId: null,
    productCode: '',
    locationId: null,
    batchNo: '',
    systemQty: null,
    actualQty: null,
    remark: ''
  }),
  create: (f) => checkDetailApi.add(toDetailPayload(f)),
  update: (f) => checkDetailApi.update(f.id, toDetailPayload(f)),
  onSuccess: () => loadData(),
  createText: '添加成功'
})
const openDetailForm = (row) => {
  if (row) return editDetail(row)
  createDetail()
  dForm.checkId = detail.order.id
}
const detailRules = {
  skuId: [{ required: true, message: '请选择物料', trigger: 'change' }],
  locationId: [{ required: true, message: '请选择库位', trigger: 'change' }],
  productCode: [{ required: true, message: '请输入商品编码', trigger: 'blur' }]
}
const onMaterialChange = (id) => {
  const m = materials.value.find((x) => x.id === id)
  if (m) dForm.productCode = m.materialCode
}
const deleteDetail = (row) =>
  confirmAction('确定删除该明细吗？', () => checkDetailApi.delete(row.id), {
    successText: '删除成功',
    onSuccess: () => loadData()
  })

onMounted(() => loadData())
</script>

<style scoped>
.detail-head {
  margin-bottom: 18px;
}
.detail-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.detail-title {
  font-weight: 600;
  color: var(--brand-secondary);
}
</style>
