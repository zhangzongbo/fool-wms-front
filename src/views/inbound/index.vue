<template>
  <div class="page-container">
    <PageHeader subtitle="入库单全流程：草稿 → 审核 → 完成入库（驱动库存增加并写流水）">
      <template #actions>
        <el-button v-perm="'sys:inbound:add'" type="primary" :icon="Plus" @click="openCreate">新增入库单</el-button>
      </template>
    </PageHeader>

    <SearchPanel :model="query" :action-span="8" @search="search" @reset="reset">
      <el-col :span="6"
        ><el-form-item label="入库单号"
          ><el-input v-model="query.keyword" placeholder="单号 / 供应商，回车查询" clearable /></el-form-item
      ></el-col>
      <el-col :span="5"
        ><el-form-item label="仓库"
          ><el-select v-model="query.warehouseId" placeholder="全部" clearable style="width: 100%" @change="search">
            <el-option
              v-for="w in warehouses"
              :key="w.id"
              :label="w.warehouseName"
              :value="w.id" /></el-select></el-form-item
      ></el-col>
      <el-col :span="5"
        ><el-form-item label="货主"
          ><el-select
            v-model="query.ownerId"
            placeholder="全部"
            clearable
            filterable
            style="width: 100%"
            @change="search"
          >
            <el-option v-for="o in owners" :key="o.id" :label="o.ownerName" :value="o.id" /></el-select></el-form-item
      ></el-col>
    </SearchPanel>

    <el-card class="table-card">
      <TableToolbar :loading="loading" @refresh="loadData(true)">
        <template #left>
          <StatusTabs v-model="query.status" :options="INBOUND_STATUS" :counts="extra.statusCounts" @change="search" />
        </template>
      </TableToolbar>
      <el-table v-loading="loading" :data="list" stripe border>
        <el-table-column type="index" :index="rowIndex(page)" label="#" width="60" align="center" fixed="left" />
        <el-table-column prop="inboundCode" label="入库单号" min-width="160" fixed="left" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center" fixed="left">
          <template #default="{ row }"
            ><el-tag :type="dictType(INBOUND_STATUS, row.status)">{{
              dictLabel(INBOUND_STATUS, row.status)
            }}</el-tag></template
          >
        </el-table-column>
        <el-table-column label="货主" min-width="130" show-overflow-tooltip
          ><template #default="{ row }">{{ ownerName(row.ownerId) }}</template></el-table-column
        >
        <el-table-column label="仓库" min-width="150" show-overflow-tooltip
          ><template #default="{ row }">{{ warehouseName(row.warehouseId) }}</template></el-table-column
        >
        <el-table-column
          prop="supplierName"
          label="供应商"
          min-width="150"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column label="入库类型" width="110" align="center"
          ><template #default="{ row }">{{ optionLabel(INBOUND_TYPE, row.inboundType) }}</template></el-table-column
        >
        <el-table-column label="明细（项 / 数量）" width="140" align="right" class-name="num"
          ><template #default="{ row }"
            >{{ row.itemCount }} / {{ formatQty(row.totalQuantity) }}</template
          ></el-table-column
        >
        <el-table-column label="创建人" min-width="100" show-overflow-tooltip
          ><template #default="{ row }">{{ dash(row.createByName) }}</template></el-table-column
        >
        <el-table-column label="创建时间" width="160" align="center"
          ><template #default="{ row }">{{ formatDateTime(row.createTime) }}</template></el-table-column
        >
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip :formatter="tableDash" />
        <el-table-column label="操作" width="190" fixed="right" align="center">
          <template #default="{ row }"><RowActions :actions="rowActions(row)" /></template>
        </el-table-column>
      </el-table>
      <ListPagination v-model:current="page.current" v-model:size="page.size" :total="total" @change="reload" />
    </el-card>

    <!-- 新增/编辑单头 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.isEdit ? '编辑入库单' : '新增入库单'"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="入库单号" prop="inboundCode"
          ><el-input v-model="form.inboundCode" :disabled="dialog.isEdit"
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
        <el-form-item label="入库类型" prop="inboundType">
          <el-select v-model="form.inboundType" placeholder="请选择" style="width: 100%">
            <el-option v-for="t in INBOUND_TYPE" :key="t.value" :label="t.label" :value="t.value"
          /></el-select>
        </el-form-item>
        <el-form-item label="供应商" prop="supplierName"><el-input v-model="form.supplierName" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 明细抽屉 -->
    <el-drawer v-model="detail.visible" :title="`入库单明细 · ${detail.order?.inboundCode || ''}`" size="52%">
      <div v-if="detail.order" class="detail-head">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="入库单号">{{ detail.order.inboundCode }}</el-descriptions-item>
          <el-descriptions-item label="状态"
            ><el-tag :type="dictType(INBOUND_STATUS, detail.order.status)">{{
              dictLabel(INBOUND_STATUS, detail.order.status)
            }}</el-tag></el-descriptions-item
          >
          <el-descriptions-item label="仓库">{{ warehouseName(detail.order.warehouseId) }}</el-descriptions-item>
          <el-descriptions-item label="货主">{{ ownerName(detail.order.ownerId) }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ detail.order.supplierName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detail.order.createByName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detail.order.createTime) }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <div class="detail-toolbar">
        <span class="detail-title">商品明细（{{ detailList.length }}）</span>
        <el-button
          v-if="detail.order?.status === 'DRAFT'"
          v-perm="'sys:inbound:update'"
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
        <el-table-column prop="quantity" label="数量" width="90" align="right" class-name="num" :formatter="tableQty" />
        <el-table-column prop="unit" label="单位" width="60" align="center" />
        <el-table-column prop="batchNo" label="批次" min-width="90" show-overflow-tooltip :formatter="tableDash" />
        <el-table-column label="库位" min-width="100" align="center" show-overflow-tooltip
          ><template #default="{ row }">{{ locationCode(row.locationId) }}</template></el-table-column
        >
        <el-table-column v-if="detail.order?.status === 'DRAFT'" label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button v-perm="'sys:inbound:update'" link type="primary" @click="openDetailForm(row)">编辑</el-button>
            <el-button v-perm="'sys:inbound:update'" link type="danger" @click="deleteDetail(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <!-- 明细表单 -->
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
          <el-col :span="12"
            ><el-form-item label="效期"
              ><el-date-picker
                v-model="dForm.expireDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%" /></el-form-item
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
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus } from '@element-plus/icons-vue'
import PageHeader from '@/components/list-page/PageHeader.vue'
import SearchPanel from '@/components/list-page/SearchPanel.vue'
import TableToolbar from '@/components/list-page/TableToolbar.vue'
import ListPagination from '@/components/list-page/ListPagination.vue'
import StatusTabs from '@/components/list-page/StatusTabs.vue'
import RowActions from '@/components/RowActions.vue'
import { inboundApi, inboundDetailApi } from '@/api'
import { useServerList } from '@/composables/useServerList'
import { useDialogForm } from '@/composables/useDialogForm'
import { useOrderDetail } from '@/composables/useOrderDetail'
import { confirmAction } from '@/utils/confirm'
import { formatDateTime } from '@/utils'
import { dash, tableDash, formatQty, tableQty, rowIndex } from '@/utils/format'
import { useRefDataStore } from '@/stores/refData'
import { INBOUND_STATUS, INBOUND_TYPE, dictLabel, dictType, optionLabel } from '@/constants/dict'

const refData = useRefDataStore()
const { owners, warehouses, locations, materials } = storeToRefs(refData)
const { ownerName, warehouseName, locationCode } = refData
const canCancel = (s) => ['DRAFT', 'AUDITED'].includes(s)

// 服务端分页；状态由页签控制，计数随其他筛选条件变化（后端 statusCounts）
const { query, page, list, total, extra, loading, search, reset, reload } = useServerList((p) => inboundApi.page(p), {
  keyword: '',
  warehouseId: null,
  ownerId: null,
  status: ''
})

const { detail, detailList, openDetail, syncDetail } = useOrderDetail(
  (id) => inboundDetailApi.list(id),
  (id) => inboundApi.getById(id)
)

// force：刷新按钮强制重拉参考数据；操作后刷新仅重拉单据
const loadData = async (force = false) => {
  await Promise.all([reload(), refData.ensure(['owners', 'materials', 'warehouses', 'locations'], { force })])
  syncDetail()
}

// 单头表单
const genCode = () =>
  'IN' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + Math.floor(Math.random() * 900 + 100)
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
    inboundCode: genCode(),
    warehouseId: '',
    supplierName: '',
    inboundType: 'PURCHASE',
    remark: '',
    status: 'DRAFT'
  }),
  create: (f) => inboundApi.add(f),
  update: (f) => inboundApi.update(f.id, f),
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
  inboundCode: [{ required: true, message: '请输入入库单号', trigger: 'blur' }],
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  ownerId: [{ required: true, message: '请选择货主', trigger: 'change' }],
  inboundType: [{ required: true, message: '请选择入库类型', trigger: 'change' }],
  supplierName: [{ required: true, message: '请输入供应商', trigger: 'blur' }]
}

const changeStatus = (row, status, label) =>
  confirmAction(`确定${label}入库单「${row.inboundCode}」吗？`, () => inboundApi.changeStatus(row.id, status), {
    successText: `${label}成功`,
    onSuccess: () => loadData()
  })
const handleComplete = (row) =>
  confirmAction('完成入库将按明细增加库存并写入流水，确定继续？', () => inboundApi.complete(row.id), {
    title: '完成入库',
    confirmButtonText: '完成入库',
    successText: '入库完成',
    onSuccess: () => loadData()
  })
const handleDelete = (row) =>
  confirmAction(`确定删除入库单「${row.inboundCode}」吗？`, () => inboundApi.delete(row.id), {
    successText: '删除成功',
    onSuccess: () => loadData()
  })

// 行操作按优先级排列：状态推进 > 编辑；溢出时危险操作收进「更多」
const rowActions = (row) => {
  const draft = row.status === 'DRAFT'
  return [
    { label: '明细', onClick: () => openDetail(row) },
    {
      label: '审核',
      show: draft,
      perm: 'sys:inbound:status',
      type: 'success',
      onClick: () => changeStatus(row, 'AUDITED', '审核')
    },
    {
      label: '完成入库',
      show: row.status === 'AUDITED',
      perm: 'sys:inbound:complete',
      type: 'success',
      onClick: () => handleComplete(row)
    },
    { label: '编辑', show: draft, perm: 'sys:inbound:update', onClick: () => openEdit(row) },
    {
      label: '取消',
      show: canCancel(row.status),
      perm: 'sys:inbound:status',
      danger: true,
      type: 'warning',
      onClick: () => changeStatus(row, 'CANCELLED', '取消')
    },
    { label: '删除', show: draft, perm: 'sys:inbound:delete', danger: true, onClick: () => handleDelete(row) }
  ]
}

// 明细表单
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
    inboundId: null,
    productCode: '',
    productName: '',
    quantity: 1,
    unit: '',
    batchNo: '',
    locationId: null,
    expireDate: null,
    remark: ''
  }),
  create: (f) => inboundDetailApi.add(f),
  update: (f) => inboundDetailApi.update(f.id, f),
  onSuccess: () => loadData(),
  createText: '添加成功'
})
const openDetailForm = (row) => {
  if (row) return editDetail(row)
  createDetail()
  dForm.inboundId = detail.order.id
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
  confirmAction('确定删除该明细吗？', () => inboundDetailApi.delete(row.id), {
    successText: '删除成功',
    onSuccess: () => loadData()
  })

onMounted(() => loadData())
</script>
