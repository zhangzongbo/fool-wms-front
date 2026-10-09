<template>
  <div v-loading="loading" class="page-container">
    <PageHeader :title="pageTitle" :subtitle="subtitle">
      <template #actions>
        <el-button @click="goBack">返回</el-button>
        <el-button type="primary" :loading="saving" :disabled="loading" @click="save">保存</el-button>
      </template>
    </PageHeader>

    <el-card class="form-card">
      <el-form ref="formRef" :model="header" :rules="rules" label-width="110px" :disabled="countMode">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="单号">
              <el-input :model-value="header.code || '保存后自动生成'" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="仓库" prop="warehouseId">
              <el-select
                v-model="header.warehouseId"
                placeholder="请选择仓库"
                filterable
                style="width: 100%"
                @change="onWarehouseChange"
              >
                <el-option v-for="w in warehouses" :key="w.id" :label="w.warehouseName" :value="w.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="货主" prop="ownerId">
              <el-select
                v-model="header.ownerId"
                placeholder="请选择货主"
                filterable
                :disabled="ownerLocked"
                style="width: 100%"
              >
                <el-option v-for="o in owners" :key="o.id" :label="o.ownerName" :value="o.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="`${cfg.label.slice(0, 2)}类型`" prop="type">
              <el-select v-model="header.type" style="width: 100%">
                <el-option v-for="t in cfg.typeDict" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="cfg.party" :span="8">
            <el-form-item :label="cfg.party.label" prop="party">
              <el-input v-model="header.party" maxlength="128" />
            </el-form-item>
          </el-col>
          <el-col v-if="cfg.expectedDate" :span="8">
            <el-form-item :label="cfg.expectedDate.label">
              <el-date-picker
                v-model="header.expectedDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选填，可清空"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col v-if="cfg.kind === 'check'" :span="8">
            <el-form-item label="库区">
              <el-select v-model="header.areaId" placeholder="不限（整仓盘点）" clearable style="width: 100%">
                <el-option v-for="a in headerAreas" :key="a.id" :label="a.areaName" :value="a.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="cfg.kind === 'check' ? 16 : 24">
            <el-form-item label="备注">
              <el-input v-model="header.remark" maxlength="512" placeholder="选填，可清空" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <div class="detail-toolbar">
        <span class="detail-title">{{ countMode ? '录入实盘量' : '明细' }}</span>
      </div>
      <LineEditor
        v-model="lines"
        :kind="cfg.kind"
        :mode="countMode ? 'count' : 'edit'"
        :warehouse-id="header.warehouseId"
        :server-errors="serverErrors"
      />
    </el-card>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/list-page/PageHeader.vue'
import LineEditor from '@/components/order/LineEditor.vue'
import { useRefDataStore } from '@/stores/refData'
import { ORDER_KINDS } from './orderKinds'

/**
 * 单据编辑页（新建 / 编辑草稿 / 盘点中录入实盘）：单头 + 明细一次保存（后端整单保存，同一事务）
 * - 单号由后端在新建时生成
 * - 后端返回的行错误（code=400，data=[{ line, field, message }]）在明细表中标红
 * - 有未保存修改时离开页面需确认
 */
const props = defineProps({ kind: { type: String, required: true } })
const cfg = ORDER_KINDS[props.kind]

const route = useRoute()
const router = useRouter()
const refData = useRefDataStore()
const { owners, warehouses, areas } = storeToRefs(refData)

const id = computed(() => (route.params.id ? Number(route.params.id) : null))
const loading = ref(false)
const saving = ref(false)
const formRef = ref()
const status = ref('DRAFT')
const header = reactive({
  code: '',
  warehouseId: null,
  ownerId: null,
  type: cfg.defaultType,
  party: '',
  expectedDate: null,
  areaId: null,
  remark: ''
})
const lines = ref([])
const serverErrors = ref([])
const ownerLocked = ref(false)
let snapshot = ''
let saved = false

// 盘点中：单头只读，明细只录实盘量 / 备注
const countMode = computed(() => cfg.kind === 'check' && status.value === 'CHECKING')
const pageTitle = computed(() =>
  id.value ? `${countMode.value ? '录入实盘' : '编辑' + cfg.label} ${header.code}` : `新建${cfg.label}`
)
const subtitle = computed(() =>
  countMode.value ? '只能录入实盘量与备注；保存后可在详情页「完成盘点」' : '单头与明细一起保存；草稿状态下可反复修改'
)
const headerAreas = computed(() => areas.value.filter((a) => a.warehouseId === header.warehouseId))

const rules = {
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  ownerId: [{ required: true, message: '请选择货主', trigger: 'change' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  ...(cfg.party?.required ? { party: [{ required: true, message: `请输入${cfg.party.label}`, trigger: 'blur' }] } : {})
}

const state = () => JSON.stringify({ header, lines: lines.value })
const dirty = () => !saved && state() !== snapshot

// 换仓库后，明细中不属于新仓库的库位清空（后端也会校验）
const onWarehouseChange = () => {
  if (cfg.kind === 'check') header.areaId = null
  const valid = new Set(refData.locations.filter((l) => l.warehouseId === header.warehouseId).map((l) => l.id))
  let cleared = 0
  lines.value.forEach((l) => {
    if (l.locationId != null && !valid.has(l.locationId)) {
      l.locationId = null
      cleared++
    }
  })
  if (cleared) ElMessage.warning(`${cleared} 行明细的库位不属于新仓库，已清空，请重新选择`)
}

const fromView = (vo) => {
  status.value = vo.status
  Object.assign(header, {
    code: vo[cfg.codeKey],
    warehouseId: vo.warehouseId,
    ownerId: vo.ownerId,
    type: vo[cfg.typeKey] || cfg.defaultType,
    party: cfg.party ? vo[cfg.party.key] || '' : '',
    expectedDate: cfg.expectedDate ? vo[cfg.expectedDate.key] || null : null,
    areaId: vo.areaId ?? null,
    remark: vo.remark || ''
  })
  ownerLocked.value = vo.ownerId != null
  // 效期沿用 Date 类型，接口返回带时区的完整时间，日期选择器只认 YYYY-MM-DD
  lines.value = (vo.lines || []).map((l) => ({
    ...l,
    batchNo: l.batchNo || '',
    remark: l.remark || '',
    expireDate: l.expireDate ? String(l.expireDate).slice(0, 10) : null
  }))
}

const load = async () => {
  loading.value = true
  try {
    await refData.ensure(cfg.refKeys)
    if (!id.value) return
    const vo = await cfg.api.view(id.value)
    fromView(vo)
    const editable = vo.status === 'DRAFT' || (cfg.kind === 'check' && vo.status === 'CHECKING')
    if (!editable) {
      ElMessage.warning(`${cfg.label}已不是草稿，不能编辑`)
      saved = true
      router.replace(`${cfg.listPath}/${id.value}`)
    }
  } catch (e) {
    // 错误提示已由请求拦截器处理
  } finally {
    loading.value = false
    snapshot = state()
  }
}

const toPayload = () => ({
  header: {
    warehouseId: header.warehouseId,
    ownerId: header.ownerId,
    [cfg.typeKey]: header.type,
    ...(cfg.party ? { [cfg.party.key]: header.party } : {}),
    ...(cfg.expectedDate ? { [cfg.expectedDate.key]: header.expectedDate || null } : {}),
    ...(cfg.kind === 'check' ? { areaId: header.areaId || null } : {}),
    remark: header.remark || null
  },
  lines: lines.value.map((l) => ({
    skuId: l.skuId,
    locationId: l.locationId,
    ...(cfg.kind !== 'check' ? { quantity: l.quantity } : {}),
    batchNo: l.batchNo || null,
    ...(cfg.kind === 'inbound' ? { expireDate: l.expireDate || null } : {}),
    remark: l.remark || null
  }))
})

const save = async () => {
  serverErrors.value = []
  if (!countMode.value) {
    const ok = await formRef.value.validate().catch(() => false)
    if (!ok) return
    if (!lines.value.length) return ElMessage.warning('请至少添加一行明细')
    const pending = lines.value.filter((l) => l._errors?.length || !l.skuId || !l.locationId).length
    if (pending) return ElMessage.warning(`有 ${pending} 行明细未完成（物料、库位必填，标红行需修正）`)
  }
  saving.value = true
  try {
    let result
    if (countMode.value) {
      await cfg.api.saveCounts(id.value, {
        lines: lines.value.map((l) => ({ id: l.id, actualQty: l.actualQty ?? null, remark: l.remark || null }))
      })
      result = { id: id.value }
    } else {
      result = id.value ? await cfg.api.updateFull(id.value, toPayload()) : await cfg.api.createFull(toPayload())
    }
    saved = true
    ElMessage.success('保存成功')
    router.replace(`${cfg.listPath}/${result?.id ?? id.value}`)
  } catch (e) {
    if (e?.code === 400 && Array.isArray(e.data)) serverErrors.value = e.data
  } finally {
    saving.value = false
  }
}

const goBack = () => (window.history.state?.back ? router.back() : router.push(cfg.listPath))

onBeforeRouteLeave(async () => {
  if (!dirty()) return true
  return ElMessageBox.confirm('有未保存的修改，确定离开？', '提示', { type: 'warning', confirmButtonText: '离开' })
    .then(() => true)
    .catch(() => false)
})
const beforeUnload = (e) => {
  if (dirty()) e.preventDefault()
}
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  load()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>
