<template>
  <div class="line-editor">
    <div class="line-toolbar">
      <span class="line-summary"
        >共 {{ modelValue.length }} 行<template v-if="hasQuantity">
          · 数量合计 <span class="num">{{ formatQty(totalQuantity) }}</span></template
        ><template v-if="errorRows">
          · <span class="text-danger">{{ errorRows }} 行待修正</span></template
        ></span
      >
      <div v-if="mode === 'edit'" class="line-actions">
        <el-button :icon="Plus" @click="addLine">添加行</el-button>
        <el-button :icon="DocumentCopy" :disabled="!warehouseId" @click="paste.visible = true">从 Excel 粘贴</el-button>
      </div>
    </div>

    <el-table :data="modelValue" border size="small" :row-class-name="rowClass" max-height="520">
      <el-table-column type="index" label="#" width="50" align="center" />
      <el-table-column label="物料" min-width="220">
        <template #default="{ row }">
          <el-select-v2
            v-if="mode === 'edit'"
            v-model="row.skuId"
            :options="materialOptions"
            filterable
            placeholder="编码 / 名称"
            style="width: 100%"
            @change="(id) => onMaterialChange(row, id)"
          />
          <span v-else>{{ dash(row.productCode) }} {{ row.productName || '' }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="kind !== 'check'" label="单位" width="70" align="center">
        <template #default="{ row }">{{ dash(row.unit) }}</template>
      </el-table-column>
      <el-table-column v-if="hasQuantity" label="数量" width="130" align="right">
        <template #default="{ row }">
          <el-input-number
            v-model="row.quantity"
            :min="1"
            :step="1"
            step-strictly
            controls-position="right"
            style="width: 100%"
            @change="clearErrors(row, '数量')"
          />
        </template>
      </el-table-column>
      <el-table-column label="库位" min-width="160">
        <template #default="{ row }">
          <el-select-v2
            v-if="mode === 'edit'"
            v-model="row.locationId"
            :options="locationOptions"
            filterable
            :placeholder="warehouseId ? '选择库位' : '请先选择仓库'"
            :disabled="!warehouseId"
            style="width: 100%"
            @change="clearErrors(row, '库位')"
          />
          <span v-else>{{ locationCode(row.locationId) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="批次" min-width="120">
        <template #default="{ row }">
          <el-input v-if="mode === 'edit'" v-model="row.batchNo" placeholder="选填" />
          <span v-else>{{ dash(row.batchNo) }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="kind === 'inbound'" label="效期" width="150">
        <template #default="{ row }">
          <el-date-picker
            v-model="row.expireDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选填"
            style="width: 100%"
            @change="clearErrors(row, '效期')"
          />
        </template>
      </el-table-column>
      <template v-if="mode === 'count'">
        <el-table-column label="账面量" width="100" align="right" class-name="num">
          <template #default="{ row }">{{ formatQty(row.systemQty) }}</template>
        </el-table-column>
        <el-table-column label="实盘量" width="140" align="right">
          <template #default="{ row }">
            <el-input-number
              v-model="row.actualQty"
              :min="0"
              :step="1"
              step-strictly
              controls-position="right"
              placeholder="未盘"
              style="width: 100%"
            />
          </template>
        </el-table-column>
      </template>
      <el-table-column label="备注" min-width="140">
        <template #default="{ row }"><el-input v-model="row.remark" placeholder="选填" /></template>
      </el-table-column>
      <el-table-column label="" width="70" align="center" fixed="right">
        <template #default="{ row, $index }">
          <el-tooltip v-if="rowErrors(row, $index).length" placement="top">
            <template #content>
              <div v-for="(msg, i) in rowErrors(row, $index)" :key="i">{{ msg }}</div>
            </template>
            <el-icon class="text-danger row-error-icon"><WarningFilled /></el-icon>
          </el-tooltip>
          <el-button v-if="mode === 'edit'" link type="danger" :icon="Delete" @click="removeLine($index)" />
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="paste.visible" title="从 Excel 粘贴明细" width="640px" append-to-body>
      <p class="paste-tip">
        在 Excel 中按以下列顺序选中多行后复制，粘贴到下方（可包含表头）：<b>{{ pasteColumnText }}</b
        >。匹配不到的物料 / 库位会标红，可在表格中修正。
      </p>
      <el-input v-model="paste.text" type="textarea" :rows="10" placeholder="在此粘贴" />
      <template #footer>
        <el-button @click="paste.visible = false">取消</el-button>
        <el-button type="primary" :disabled="!paste.text.trim()" @click="applyPaste">追加到明细</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus, Delete, DocumentCopy, WarningFilled } from '@element-plus/icons-vue'
import { useRefDataStore } from '@/stores/refData'
import { dash, formatQty } from '@/utils/format'
import { parsePastedLines, PASTE_COLUMNS, PASTE_COLUMN_LABELS } from './lineParser'

/**
 * 单据明细编辑表（编辑页使用）
 * - mode=edit：整单编辑（物料、数量、库位、批次、效期、备注），可从 Excel 粘贴批量追加
 * - mode=count：盘点中只录实盘量与备注，其余只读
 * - 物料 / 库位用虚拟列表下拉（el-select-v2），库位只列出单头仓库下的库位
 * - 行错误来源：粘贴解析的 _errors + 后端整单保存返回的行错误（serverErrors，line 从 1 开始）
 */
const props = defineProps({
  modelValue: { type: Array, required: true },
  kind: { type: String, required: true }, // inbound / outbound / check
  mode: { type: String, default: 'edit' }, // edit / count
  warehouseId: { type: Number, default: null },
  serverErrors: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue'])

const refData = useRefDataStore()
const { materials, locations } = storeToRefs(refData)
const { locationCode } = refData

const hasQuantity = computed(() => props.kind !== 'check' && props.mode === 'edit')
const materialOptions = computed(() =>
  materials.value.map((m) => ({ value: m.id, label: `${m.materialCode} ${m.materialName}` }))
)
const warehouseLocations = computed(() => locations.value.filter((l) => l.warehouseId === props.warehouseId))
const locationOptions = computed(() =>
  warehouseLocations.value.map((l) => ({ value: l.id, label: `${l.locationCode} ${l.locationName || ''}`.trim() }))
)
const totalQuantity = computed(() => props.modelValue.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0))

const serverErrorsByLine = computed(() => {
  const map = new Map()
  props.serverErrors.forEach((e) => map.set(e.line, [...(map.get(e.line) || []), e.message]))
  return map
})
const rowErrors = (row, index) => [...(row._errors || []), ...(serverErrorsByLine.value.get(index + 1) || [])]
const errorRows = computed(() => props.modelValue.filter((row, i) => rowErrors(row, i).length).length)
const rowClass = ({ row, rowIndex }) => (rowErrors(row, rowIndex).length ? 'is-error-row' : '')

const emptyLine = () => ({
  skuId: null,
  productCode: '',
  productName: '',
  unit: '',
  quantity: props.kind === 'check' ? undefined : 1,
  locationId: null,
  batchNo: '',
  expireDate: null,
  remark: ''
})
const addLine = () => emit('update:modelValue', [...props.modelValue, emptyLine()])
const removeLine = (index) =>
  emit(
    'update:modelValue',
    props.modelValue.filter((_, i) => i !== index)
  )

// 粘贴解析的错误按字段清除：用户修改了该字段即视为已修正（保存时后端会再校验一次）
const clearErrors = (row, field) => {
  if (row._errors?.length) row._errors = row._errors.filter((msg) => !msg.includes(field))
}

// 选中物料时回填编码 / 名称 / 单位（保存时后端会以物料主数据为准再回填一次）
const onMaterialChange = (row, id) => {
  const m = materials.value.find((x) => x.id === id)
  if (!m) return
  Object.assign(row, { productCode: m.materialCode, productName: m.materialName, unit: m.unit || row.unit })
  clearErrors(row, '物料')
}

const paste = reactive({ visible: false, text: '' })
const pasteColumnText = computed(() => PASTE_COLUMNS[props.kind].map((k) => PASTE_COLUMN_LABELS[k]).join('、'))
const applyPaste = () => {
  const lines = parsePastedLines(paste.text, {
    kind: props.kind,
    materialsByCode: new Map(materials.value.map((m) => [m.materialCode, m])),
    locationsByCode: new Map(locations.value.map((l) => [l.locationCode, l])),
    warehouseId: props.warehouseId
  }).map((l) => ({ ...emptyLine(), ...l }))
  emit('update:modelValue', [...props.modelValue, ...lines])
  paste.text = ''
  paste.visible = false
}
</script>

<style scoped>
.line-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.line-summary {
  font-size: 13px;
  color: var(--brand-text-secondary);
}
.line-actions {
  display: flex;
  gap: 8px;
}
.row-error-icon {
  vertical-align: middle;
  margin-right: 4px;
  cursor: help;
}
.line-editor :deep(.is-error-row > td) {
  background-color: var(--el-color-danger-light-9) !important;
}
.paste-tip {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--brand-text-secondary);
}
</style>
