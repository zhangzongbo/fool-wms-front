<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>库存查询</h2>
        <p class="page-subtitle">按货主 / SKU / 批次 / 库位维度的实时库存，受数据范围隔离</p>
      </div>
      <div class="header-actions">
        <el-button @click="loadData(true)"><el-icon><Refresh /></el-icon> 刷新</el-button>
        <el-button type="primary" @click="openOp()"><el-icon><Operation /></el-icon> 库存操作</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6"><div class="stat-card"><div class="stat-content"><div class="stat-value">{{ rawList.length }}</div><div class="stat-label">库存记录数</div></div></div></el-col>
      <el-col :span="6"><div class="stat-card success"><div class="stat-content"><div class="stat-value">{{ totalQty }}</div><div class="stat-label">在库总量</div></div></div></el-col>
      <el-col :span="6"><div class="stat-card warning"><div class="stat-content"><div class="stat-value">{{ totalFrozen }}</div><div class="stat-label">冻结总量</div></div></div></el-col>
      <el-col :span="6"><div class="stat-card danger"><div class="stat-content"><div class="stat-value">{{ zeroCount }}</div><div class="stat-label">零可用库存</div></div></div></el-col>
    </el-row>

    <el-card class="search-card">
      <el-form :model="search" label-position="top" @submit.prevent>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="货主"><el-select v-model="search.ownerId" placeholder="全部货主" clearable style="width:100%">
            <el-option v-for="o in owners" :key="o.id" :label="o.ownerName" :value="o.id" /></el-select></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="商品编码/名称"><el-input v-model="search.keyword" placeholder="商品编码或名称" clearable /></el-form-item></el-col>
          <el-col :span="5"><el-form-item label="批次号"><el-input v-model="search.batchNo" placeholder="批次号" clearable /></el-form-item></el-col>
          <el-col :span="7"><el-form-item label=" ">
            <el-button type="primary" @click="page.current=1"><el-icon><Search /></el-icon>查询</el-button>
            <el-button @click="resetSearch"><el-icon><Refresh /></el-icon>重置</el-button>
          </el-form-item></el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table v-loading="loading" :data="pagedList" stripe border>
        <el-table-column type="index" label="#" width="55" align="center" />
        <el-table-column label="货主" min-width="140"><template #default="{ row }">{{ ownerName(row.ownerId) }}</template></el-table-column>
        <el-table-column prop="productCode" label="商品编码" min-width="130" show-overflow-tooltip />
        <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="batchNo" label="批次号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="locationCode" label="库位" min-width="110" />
        <el-table-column label="在库量" width="100" align="right"><template #default="{ row }">{{ num(row.quantity) }}</template></el-table-column>
        <el-table-column label="冻结量" width="100" align="right">
          <template #default="{ row }"><span :class="{ 'text-warning': num(row.frozenQuantity) > 0 }">{{ num(row.frozenQuantity) }}</span></template>
        </el-table-column>
        <el-table-column label="可用量" width="100" align="right">
          <template #default="{ row }"><span :class="available(row) <= 0 ? 'text-danger' : 'text-success'">{{ available(row) }}</span></template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="70" align="center" />
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }"><el-button link type="primary" @click="openOp(row)">库存操作</el-button></template>
        </el-table-column>
      </el-table>
      <el-pagination background layout="total, sizes, prev, pager, next, jumper"
        :total="filtered.length" :current-page="page.current" :page-size="page.size" :page-sizes="[10,20,50]"
        @current-change="(v)=>page.current=v" @size-change="(v)=>{page.size=v;page.current=1}" />
    </el-card>

    <!-- 库存操作 -->
    <el-dialog v-model="dialog.visible" title="库存操作" width="560px" @close="resetForm">
      <el-radio-group v-model="form.op" class="op-tabs">
        <el-radio-button value="increase">入库（增加）</el-radio-button>
        <el-radio-button value="decrease">出库（扣减）</el-radio-button>
        <el-radio-button value="freeze">冻结</el-radio-button>
        <el-radio-button value="releaseFrozen">释放冻结</el-radio-button>
      </el-radio-group>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" style="margin-top:18px">
        <el-form-item label="货主" prop="ownerId">
          <el-select v-model="form.ownerId" placeholder="请选择货主" style="width:100%">
            <el-option v-for="o in owners" :key="o.id" :label="o.ownerName" :value="o.id" /></el-select>
        </el-form-item>
        <el-form-item label="SKU ID" prop="skuId"><el-input-number v-model="form.skuId" :min="1" :controls="false" style="width:100%" placeholder="物料/SKU ID" /></el-form-item>
        <el-form-item label="库位 ID" prop="locationId"><el-input-number v-model="form.locationId" :min="1" :controls="false" style="width:100%" placeholder="库位 ID" /></el-form-item>
        <el-form-item label="批次号"><el-input v-model="form.batchNo" placeholder="可空" /></el-form-item>
        <el-form-item label="数量" prop="quantity"><el-input-number v-model="form.quantity" :min="0.0001" :precision="4" style="width:100%" /></el-form-item>
        <template v-if="form.op === 'increase'">
          <el-form-item label="商品编码"><el-input v-model="form.productCode" /></el-form-item>
          <el-form-item label="商品名称"><el-input v-model="form.productName" /></el-form-item>
          <el-form-item label="单位"><el-input v-model="form.unit" placeholder="如：件 / 箱" /></el-form-item>
        </template>
      </el-form>
      <el-alert :title="opHint" :type="opAlertType" :closable="false" show-icon />
      <template #footer>
        <el-button @click="dialog.visible=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确认操作</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Refresh, Search, Operation } from '@element-plus/icons-vue'
import { inventoryApi } from '@/api'
import { useLocalPage } from '@/composables/useLocalPage'
import { settledValue } from '@/utils'
import { useRefDataStore } from '@/stores/refData'

const refData = useRefDataStore()
const { owners } = storeToRefs(refData)
const loading = ref(false)
const submitting = ref(false)
const rawList = ref([])
const search = reactive({ ownerId: '', keyword: '', batchNo: '' })

const num = (v) => Number(v ?? 0)
const available = (row) => num(row.quantity) - num(row.frozenQuantity)
// 货主不在当前缓存中时显示 #id，便于排查
const ownerName = (id) => {
  if (!id) return '-'
  const name = refData.ownerName(id)
  return name === '-' ? `#${id}` : name
}

const filtered = computed(() => rawList.value.filter((i) => {
  const kw = search.keyword.trim().toLowerCase()
  const matchKw = !kw || `${i.productCode || ''}${i.productName || ''}`.toLowerCase().includes(kw)
  const matchOwner = !search.ownerId || i.ownerId === search.ownerId
  const matchBatch = !search.batchNo || (i.batchNo || '').includes(search.batchNo.trim())
  return matchKw && matchOwner && matchBatch
}))
const { page, pagedList } = useLocalPage(filtered, search)
const totalQty = computed(() => rawList.value.reduce((s, i) => s + num(i.quantity), 0))
const totalFrozen = computed(() => rawList.value.reduce((s, i) => s + num(i.frozenQuantity), 0))
const zeroCount = computed(() => rawList.value.filter((i) => available(i) <= 0).length)

// force：刷新按钮强制重拉参考数据；操作后刷新仅重拉库存
const loadData = async (force = false) => {
  loading.value = true
  try {
    const [inv] = await Promise.allSettled([inventoryApi.list(), refData.ensure(['owners'], { force })])
    rawList.value = settledValue(inv, rawList.value)
  } finally {
    loading.value = false
  }
}
const resetSearch = () => { Object.assign(search, { ownerId: '', keyword: '', batchNo: '' }); page.current = 1 }

const dialog = reactive({ visible: false })
const formRef = ref()
const defaultForm = () => ({ op: 'increase', ownerId: '', skuId: null, locationId: null, batchNo: '', quantity: 1, productCode: '', productName: '', unit: '', sourceType: 'MANUAL', sourceCode: '' })
const form = reactive(defaultForm())
const rules = {
  ownerId: [{ required: true, message: '请选择货主', trigger: 'change' }],
  skuId: [{ required: true, message: '请输入 SKU ID', trigger: 'blur' }],
  locationId: [{ required: true, message: '请输入库位 ID', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }]
}
const opHint = computed(() => ({
  increase: '增加指定库位的在库数量，若库存行不存在将自动创建。',
  decrease: '扣减在库数量，库存不足将被拒绝并触发预警。',
  freeze: '将可用库存转为冻结（在库量不变，可用量减少）。',
  releaseFrozen: '释放已冻结库存，恢复为可用状态。'
}[form.op]))
const opAlertType = computed(() => (form.op === 'decrease' ? 'warning' : 'info'))

const resetForm = () => { Object.assign(form, defaultForm()); formRef.value?.clearValidate() }
const openOp = (row) => {
  resetForm()
  if (row) {
    form.ownerId = row.ownerId
    form.skuId = row.skuId
    form.locationId = row.locationId
    form.batchNo = row.batchNo
    form.productCode = row.productCode
    form.productName = row.productName
    form.unit = row.unit
  }
  dialog.visible = true
}

const handleSubmit = async () => {
  // 校验失败时 validate() 会 reject，单独处理，避免当作操作失败
  if (!(await formRef.value.validate().catch(() => false))) return
  submitting.value = true
  try {
    const payload = {
      ownerId: form.ownerId, skuId: form.skuId, locationId: form.locationId,
      batchNo: form.batchNo || null, quantity: form.quantity,
      productCode: form.productCode, productName: form.productName, unit: form.unit,
      sourceType: form.sourceType, sourceCode: form.sourceCode
    }
    await inventoryApi[form.op](payload)
    ElMessage.success('操作成功')
    dialog.visible = false
    loadData()
  } catch (e) {
    // 接口错误提示已由请求拦截器统一弹出
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.op-tabs { width: 100%; display: flex; }
.op-tabs :deep(.el-radio-button) { flex: 1; }
.op-tabs :deep(.el-radio-button__inner) { width: 100%; }
</style>
