<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>出库管理</h2>
        <p class="page-subtitle">出库单全流程：草稿 → 审核 → 分配（冻结）→ 发货（消耗冻结出库）</p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData(true)"
          ><el-icon><Refresh /></el-icon> 刷新</el-button
        >
        <el-button v-perm="'sys:outbound:add'" type="primary" @click="openCreate"
          ><el-icon><Plus /></el-icon> 新增出库单</el-button
        >
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6"
        ><div class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ rawList.length }}</div>
            <div class="stat-label">出库单总数</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card warning">
          <div class="stat-content">
            <div class="stat-value">{{ countStatus('AUDITED') }}</div>
            <div class="stat-label">待分配</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ countStatus('ALLOCATED') }}</div>
            <div class="stat-label">待发货</div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card success">
          <div class="stat-content">
            <div class="stat-value">{{ countStatus('SHIPPED') }}</div>
            <div class="stat-label">已发货</div>
          </div>
        </div></el-col
      >
    </el-row>

    <el-card class="search-card">
      <el-form :model="search" label-position="top" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="6"
            ><el-form-item label="出库单号"
              ><el-input v-model="search.keyword" placeholder="单号 / 客户" clearable /></el-form-item
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
                  v-for="(v, k) in OUTBOUND_STATUS"
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
        <el-table-column prop="outboundCode" label="出库单号" min-width="160" fixed="left" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center" fixed="left">
          <template #default="{ row }"
            ><el-tag :type="dictType(OUTBOUND_STATUS, row.status)">{{
              dictLabel(OUTBOUND_STATUS, row.status)
            }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="货主" min-width="130" show-overflow-tooltip
          ><template #default="{ row }">{{ ownerName(row.ownerId) }}</template></el-table-column
        >
        <el-table-column label="仓库" min-width="150"
          ><template #default="{ row }">{{ warehouseName(row.warehouseId) }}</template></el-table-column
        >
        <el-table-column prop="customerName" label="客户" min-width="150" show-overflow-tooltip />
        <el-table-column label="出库类型" width="110" align="center"
          ><template #default="{ row }">{{ optionLabel(OUTBOUND_TYPE, row.outboundType) }}</template></el-table-column
        >
        <el-table-column label="明细" width="110" align="right"
          ><template #default="{ row }">{{ row.itemCount }} 项 / {{ row.totalQuantity }}</template></el-table-column
        >
        <el-table-column label="创建人" min-width="100" show-overflow-tooltip
          ><template #default="{ row }">{{ row.createByName || '-' }}</template></el-table-column
        >
        <el-table-column label="创建时间" width="160" align="center"
          ><template #default="{ row }">{{ formatDateTime(row.createTime) }}</template></el-table-column
        >
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="300" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">明细</el-button>
            <el-button
              v-if="row.status === 'DRAFT'"
              v-perm="'sys:outbound:update'"
              link
              type="primary"
              @click="openEdit(row)"
              >编辑</el-button
            >
            <el-button
              v-if="row.status === 'DRAFT'"
              v-perm="'sys:outbound:status'"
              link
              type="success"
              @click="changeStatus(row, 'AUDITED', '审核')"
              >审核</el-button
            >
            <el-button
              v-if="row.status === 'AUDITED'"
              v-perm="'sys:outbound:allocate'"
              link
              type="success"
              @click="handleAllocate(row)"
              >分配</el-button
            >
            <el-button
              v-if="row.status === 'ALLOCATED'"
              v-perm="'sys:outbound:ship'"
              link
              type="success"
              @click="handleShip(row)"
              >发货</el-button
            >
            <el-button
              v-if="canCancel(row.status)"
              v-perm="'sys:outbound:cancel'"
              link
              type="warning"
              @click="handleCancel(row)"
              >取消</el-button
            >
            <el-button
              v-if="row.status === 'DRAFT'"
              v-perm="'sys:outbound:delete'"
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
      :title="dialog.isEdit ? '编辑出库单' : '新增出库单'"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="出库单号" prop="outboundCode"
          ><el-input v-model="form.outboundCode" :disabled="dialog.isEdit"
        /></el-form-item>
        <el-form-item label="仓库" prop="warehouseId">
          <el-select v-model="form.warehouseId" placeholder="请选择仓库" style="width: 100%">
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
        <el-form-item label="出库类型" prop="outboundType">
          <el-select v-model="form.outboundType" placeholder="请选择" style="width: 100%">
            <el-option v-for="t in OUTBOUND_TYPE" :key="t.value" :label="t.label" :value="t.value"
          /></el-select>
        </el-form-item>
        <el-form-item label="客户" prop="customerName"><el-input v-model="form.customerName" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detail.visible" :title="`出库单明细 · ${detail.order?.outboundCode || ''}`" size="52%">
      <div v-if="detail.order" class="detail-head">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="出库单号">{{ detail.order.outboundCode }}</el-descriptions-item>
          <el-descriptions-item label="状态"
            ><el-tag :type="dictType(OUTBOUND_STATUS, detail.order.status)">{{
              dictLabel(OUTBOUND_STATUS, detail.order.status)
            }}</el-tag></el-descriptions-item
          >
          <el-descriptions-item label="仓库">{{ warehouseName(detail.order.warehouseId) }}</el-descriptions-item>
          <el-descriptions-item label="货主">{{ ownerName(detail.order.ownerId) }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ detail.order.customerName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detail.order.createByName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detail.order.createTime) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <div class="detail-toolbar">
        <span class="detail-title">商品明细（{{ detailList.length }}）</span>
        <el-button
          v-if="detail.order?.status === 'DRAFT'"
          v-perm="'sys:outbound:update'"
          type="primary"
          size="small"
          @click="openDetailForm()"
          ><el-icon><Plus /></el-icon> 添加明细</el-button
        >
      </div>
      <el-table v-loading="detail.loading" :data="detailList" border size="small">
        <el-table-column type="index" label="#" width="50" align="center" />
        <el-table-column prop="productCode" label="商品编码" min-width="110" show-overflow-tooltip />
        <el-table-column prop="productName" label="商品名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="80" align="right" />
        <el-table-column prop="unit" label="单位" width="60" align="center" />
        <el-table-column prop="batchNo" label="批次" min-width="90" show-overflow-tooltip />
        <el-table-column label="库位" min-width="100" align="center" show-overflow-tooltip
          ><template #default="{ row }">{{ locationCode(row.locationId) }}</template></el-table-column
        >
        <el-table-column v-if="detail.order?.status === 'DRAFT'" label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button v-perm="'sys:outbound:update'" link type="primary" @click="openDetailForm(row)">编辑</el-button>
            <el-button v-perm="'sys:outbound:update'" link type="danger" @click="deleteDetail(row)">删除</el-button>
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
            ><el-form-item label="商品名称" prop="productName"
              ><el-input v-model="dForm.productName" disabled /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="数量" prop="quantity"
              ><el-input-number v-model="dForm.quantity" :min="1" style="width: 100%" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="单位"><el-input v-model="dForm.unit" placeholder="如：件" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="批次号"><el-input v-model="dForm.batchNo" /></el-form-item
          ></el-col>
          <el-col :span="12"
            ><el-form-item label="库位" prop="locationId"
              ><el-select v-model="dForm.locationId" placeholder="选择库位" clearable filterable style="width: 100%">
                <el-option
                  v-for="l in locations"
                  :key="l.id"
                  :label="`${l.locationCode} (${l.locationName})`"
                  :value="l.id" /></el-select></el-form-item
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
import { outboundApi, outboundDetailApi } from '@/api'
import { useLocalPage } from '@/composables/useLocalPage'
import { useDialogForm } from '@/composables/useDialogForm'
import { useOrderDetail } from '@/composables/useOrderDetail'
import { confirmAction } from '@/utils/confirm'
import { settledValue, formatDateTime } from '@/utils'
import { useRefDataStore } from '@/stores/refData'
import { OUTBOUND_STATUS, OUTBOUND_TYPE, dictLabel, dictType, optionLabel } from '@/constants/dict'

const refData = useRefDataStore()
const { owners, warehouses, locations, materials } = storeToRefs(refData)
const { ownerName, warehouseName, locationCode } = refData
const loading = ref(false)
const rawList = ref([])
const search = reactive({ keyword: '', warehouseId: '', status: '' })

const canCancel = (s) => ['DRAFT', 'AUDITED', 'ALLOCATED'].includes(s)
const countStatus = (s) => rawList.value.filter((o) => o.status === s).length

const filtered = computed(() =>
  rawList.value.filter((o) => {
    const kw = search.keyword.trim().toLowerCase()
    const matchKw = !kw || `${o.outboundCode || ''}${o.customerName || ''}`.toLowerCase().includes(kw)
    const matchWh = !search.warehouseId || o.warehouseId === search.warehouseId
    const matchStatus = !search.status || o.status === search.status
    return matchKw && matchWh && matchStatus
  })
)
const { page, pagedList } = useLocalPage(filtered, search)

const { detail, detailList, openDetail, syncDetail } = useOrderDetail((id) => outboundDetailApi.list(id))

// force：刷新按钮强制重拉参考数据；操作后刷新仅重拉单据
const loadData = async (force = false) => {
  loading.value = true
  try {
    const [orders] = await Promise.allSettled([
      outboundApi.list(),
      refData.ensure(['owners', 'materials', 'warehouses', 'locations'], { force })
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
  'OUT' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + Math.floor(Math.random() * 900 + 100)
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
    outboundCode: genCode(),
    warehouseId: '',
    customerName: '',
    outboundType: 'SALE',
    remark: '',
    status: 'DRAFT'
  }),
  create: (f) => outboundApi.add(f),
  update: (f) => outboundApi.update(f.id, f),
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
const rules = {
  outboundCode: [{ required: true, message: '请输入出库单号', trigger: 'blur' }],
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  ownerId: [{ required: true, message: '请选择货主', trigger: 'change' }],
  outboundType: [{ required: true, message: '请选择出库类型', trigger: 'change' }],
  customerName: [{ required: true, message: '请输入客户', trigger: 'blur' }]
}

const changeStatus = (row, status, label) =>
  confirmAction(`确定${label}出库单「${row.outboundCode}」吗？`, () => outboundApi.changeStatus(row.id, status), {
    successText: `${label}成功`,
    onSuccess: () => loadData()
  })
const handleAllocate = (row) =>
  confirmAction('分配将按明细冻结可用库存，确定继续？', () => outboundApi.allocate(row.id), {
    title: '库存分配',
    confirmButtonText: '分配',
    successText: '分配成功',
    onSuccess: () => loadData()
  })
const handleCancel = (row) => {
  const allocated = row.status === 'ALLOCATED'
  const msg = allocated
    ? `出库单「${row.outboundCode}」已分配，取消将释放已冻结的库存，确定取消？`
    : `确定取消出库单「${row.outboundCode}」吗？`
  return confirmAction(msg, () => outboundApi.cancel(row.id), {
    title: '取消出库单',
    confirmButtonText: '确定取消',
    successText: allocated ? '已取消并释放冻结库存' : '已取消',
    onSuccess: () => loadData()
  })
}
const handleShip = (row) =>
  confirmAction('发货将消耗冻结库存并出库、写入流水，确定继续？', () => outboundApi.ship(row.id), {
    title: '确认发货',
    confirmButtonText: '发货',
    successText: '发货成功',
    onSuccess: () => loadData()
  })
const handleDelete = (row) =>
  confirmAction(`确定删除出库单「${row.outboundCode}」吗？`, () => outboundApi.delete(row.id), {
    successText: '删除成功',
    onSuccess: () => loadData()
  })

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
    outboundId: null,
    productCode: '',
    productName: '',
    quantity: 1,
    unit: '',
    batchNo: '',
    locationId: null,
    remark: ''
  }),
  create: (f) => outboundDetailApi.add(f),
  update: (f) => outboundDetailApi.update(f.id, f),
  onSuccess: () => loadData(),
  createText: '添加成功'
})
const openDetailForm = (row) => {
  if (row) return editDetail(row)
  createDetail()
  dForm.outboundId = detail.order.id
}
const detailRules = {
  skuId: [{ required: true, message: '请选择物料', trigger: 'change' }],
  locationId: [{ required: true, message: '请选择库位', trigger: 'change' }],
  productCode: [{ required: true, message: '请输入商品编码', trigger: 'blur' }],
  productName: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}
const onMaterialChange = (id) => {
  const m = materials.value.find((x) => x.id === id)
  if (!m) return
  dForm.productCode = m.materialCode
  dForm.productName = m.materialName
  dForm.unit = m.unit || dForm.unit
}
const deleteDetail = (row) =>
  confirmAction('确定删除该明细吗？', () => outboundDetailApi.delete(row.id), {
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
