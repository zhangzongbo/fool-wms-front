<template>
  <div class="page-container">
    <PageHeader
      subtitle="每一次库存变动的台账：按时间、货主、物料、库位、批次、类型、来源单据追溯（时间区间最长 180 天）"
    />

    <SearchPanel :model="query" :action-span="query.skuId ? 6 : 11" @search="search" @reset="reset">
      <el-col :xs="24" :sm="12" :md="8" :lg="6"
        ><el-form-item label="时间"
          ><el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            :clearable="false"
            :disabled-date="afterToday"
            style="width: 100%"
            @change="search" /></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="4"
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
      <el-col :xs="24" :sm="12" :md="8" :lg="5"
        ><el-form-item label="物料"
          ><el-input v-model="query.keyword" placeholder="物料编码或名称，回车查询" clearable /></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="4"
        ><el-form-item label="库位"
          ><el-select-v2
            v-model="query.locationId"
            :options="locationOptions"
            placeholder="全部"
            clearable
            filterable
            style="width: 100%"
            @change="search" /></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="5"
        ><el-form-item label="批次"
          ><el-input v-model="query.batchNo" placeholder="完整批次号，回车查询" clearable /></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="4"
        ><el-form-item label="类型"
          ><el-select v-model="query.txnType" placeholder="全部" clearable style="width: 100%" @change="search">
            <el-option
              v-for="t in INVENTORY_TXN_TYPE"
              :key="t.value"
              :label="t.label"
              :value="t.value" /></el-select></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="4"
        ><el-form-item label="来源"
          ><el-select v-model="query.sourceType" placeholder="全部" clearable style="width: 100%" @change="search">
            <el-option
              v-for="t in TXN_SOURCE_TYPE"
              :key="t.value"
              :label="t.label"
              :value="t.value" /></el-select></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="5"
        ><el-form-item label="来源单号"
          ><el-input v-model="query.sourceCode" placeholder="单号，回车查询" clearable /></el-form-item
      ></el-col>
      <el-col v-if="query.skuId" :xs="24" :sm="12" :md="8" :lg="5"
        ><el-form-item label="指定物料"
          ><el-tag closable @close="setFilter('skuId', null)">{{ materialLabel(query.skuId) }}</el-tag></el-form-item
        ></el-col
      >
    </SearchPanel>

    <el-card class="table-card">
      <TableToolbar :loading="loading" @refresh="loadData(true)">
        <template #settings><ColumnSettings :cols="cols" /></template>
        <template #actions>
          <el-button v-perm="'sys:inventory:txn-export'" :icon="Download" :loading="exporting" @click="exportList"
            >导出</el-button
          >
        </template>
        <template #left>
          <span class="list-summary">共 {{ total }} 条 · {{ query.startDate }} 至 {{ query.endDate }}</span>
        </template>
      </TableToolbar>
      <el-table v-loading="loading" :data="list" stripe border @header-dragend="cols.onDragEnd">
        <el-table-column column-key="time" label="时间" :width="cols.width('time', 160)" align="center" fixed="left"
          ><template #default="{ row }">{{ formatDateTime(row.createTime) }}</template></el-table-column
        >
        <el-table-column column-key="type" label="类型" :width="cols.width('type', 80)" align="center" fixed="left"
          ><template #default="{ row }"
            ><el-tag :type="optionType(INVENTORY_TXN_TYPE, row.txnType)" size="small">{{
              optionLabel(INVENTORY_TXN_TYPE, row.txnType)
            }}</el-tag></template
          ></el-table-column
        >
        <el-table-column
          v-if="cols.visible('owner')"
          column-key="owner"
          label="货主"
          min-width="120"
          :width="cols.width('owner')"
          show-overflow-tooltip
          ><template #default="{ row }">{{ refData.ownerName(row.ownerId) }}</template></el-table-column
        >
        <el-table-column
          column-key="product"
          label="物料"
          min-width="180"
          :width="cols.width('product')"
          show-overflow-tooltip
          ><template #default="{ row }">{{ row.productCode }} {{ row.productName || '' }}</template></el-table-column
        >
        <el-table-column
          v-if="cols.visible('location')"
          column-key="location"
          prop="locationCode"
          label="库位"
          min-width="100"
          :width="cols.width('location')"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column
          v-if="cols.visible('batch')"
          column-key="batch"
          prop="batchNo"
          label="批次"
          min-width="100"
          :width="cols.width('batch')"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column
          column-key="change"
          label="可用变动"
          :width="cols.width('change', 100)"
          align="right"
          class-name="num"
          ><template #default="{ row }"
            ><span :class="changeClass(row.changeQty)">{{ signedQty(row.changeQty) }}</span></template
          ></el-table-column
        >
        <el-table-column
          v-if="cols.visible('available')"
          column-key="available"
          label="可用（前 → 后）"
          :width="cols.width('available', 140)"
          align="right"
          class-name="num"
          ><template #default="{ row }"
            >{{ formatQty(row.beforeQty) }} → {{ formatQty(row.afterQty) }}</template
          ></el-table-column
        >
        <el-table-column
          v-if="cols.visible('frozen')"
          column-key="frozen"
          label="冻结（前 → 后）"
          :width="cols.width('frozen', 140)"
          align="right"
          class-name="num"
          ><template #default="{ row }"
            >{{ formatQty(row.beforeFrozen) }} → {{ formatQty(row.afterFrozen) }}</template
          ></el-table-column
        >
        <el-table-column
          column-key="source"
          label="来源单据"
          min-width="190"
          :width="cols.width('source')"
          show-overflow-tooltip
          ><template #default="{ row }"
            >{{ optionLabel(TXN_SOURCE_TYPE, row.sourceType, '') }}
            <el-link v-if="sourcePath(row)" type="primary" underline="never" @click="router.push(sourcePath(row))">{{
              row.sourceCode
            }}</el-link
            ><span v-else>{{ dash(row.sourceCode) }}</span></template
          ></el-table-column
        >
        <el-table-column
          v-if="cols.visible('remark')"
          column-key="remark"
          prop="remark"
          label="备注"
          min-width="120"
          :width="cols.width('remark')"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column
          v-if="cols.visible('operator')"
          column-key="operator"
          prop="createByName"
          label="操作人"
          min-width="90"
          :width="cols.width('operator')"
          show-overflow-tooltip
          :formatter="tableDash"
        />
      </el-table>
      <ListPagination v-model:current="page.current" v-model:size="page.size" :total="total" @change="reload" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Download } from '@element-plus/icons-vue'
import PageHeader from '@/components/list-page/PageHeader.vue'
import SearchPanel from '@/components/list-page/SearchPanel.vue'
import TableToolbar from '@/components/list-page/TableToolbar.vue'
import ColumnSettings from '@/components/list-page/ColumnSettings.vue'
import ListPagination from '@/components/list-page/ListPagination.vue'
import { inventoryApi, EXPORT_URLS } from '@/api'
import { useServerList } from '@/composables/useServerList'
import { useTableColumns } from '@/composables/useTableColumns'
import { downloadFile } from '@/utils/download'
import { formatDateTime } from '@/utils'
import { dash, tableDash, formatQty, recentDays } from '@/utils/format'
import { useRefDataStore } from '@/stores/refData'
import { INVENTORY_TXN_TYPE, TXN_SOURCE_TYPE, optionLabel, optionType } from '@/constants/dict'

/**
 * 库存流水（spec #16 段③）：服务端分页、筛选同步 URL（可从库存页带条件跳转、可分享），来源单号可跳到单据详情
 */
const cols = useTableColumns('inventoryTxn', [
  { key: 'time', label: '时间', fixed: true },
  { key: 'type', label: '类型', fixed: true },
  { key: 'owner', label: '货主' },
  { key: 'product', label: '物料', fixed: true },
  { key: 'location', label: '库位' },
  { key: 'batch', label: '批次' },
  { key: 'change', label: '可用变动', fixed: true },
  { key: 'available', label: '可用（前 → 后）' },
  { key: 'frozen', label: '冻结（前 → 后）' },
  { key: 'source', label: '来源单据', fixed: true },
  { key: 'remark', label: '备注' },
  { key: 'operator', label: '操作人' }
])

const router = useRouter()
const refData = useRefDataStore()
const { owners, locations, materials } = storeToRefs(refData)

const [defaultStart, defaultEnd] = recentDays(30)
const { query, page, list, total, loading, search, reset, reload, setFilter, currentParams } = useServerList(
  (p) => inventoryApi.transactions(p),
  {
    startDate: defaultStart,
    endDate: defaultEnd,
    ownerId: null,
    keyword: '',
    skuId: null,
    locationId: null,
    batchNo: '',
    txnType: '',
    sourceType: '',
    sourceCode: ''
  },
  { pageSize: 20 }
)

const dateRange = computed({
  get: () => [query.startDate, query.endDate],
  set: (v) => {
    const [start, end] = v || recentDays(30)
    query.startDate = start
    query.endDate = end
  }
})
const afterToday = (d) => d.getTime() > Date.now()

const locationOptions = computed(() =>
  locations.value.map((l) => ({ value: l.id, label: `${l.locationCode} ${l.locationName || ''}`.trim() }))
)
const materialLabel = (id) => {
  const m = materials.value.find((x) => x.id === id)
  return m ? `${m.materialCode} ${m.materialName}` : `#${id}`
}

const SOURCE_PATHS = { INBOUND: '/inbound', OUTBOUND: '/outbound', CHECK: '/check', ADJUST: '/adjust' }
const sourcePath = (row) =>
  row.sourceId && SOURCE_PATHS[row.sourceType] ? `${SOURCE_PATHS[row.sourceType]}/${row.sourceId}` : null

const signedQty = (q) => (Number(q) > 0 ? `+${formatQty(q)}` : formatQty(q))
const changeClass = (q) => (Number(q) > 0 ? 'text-success' : Number(q) < 0 ? 'text-danger' : '')

// force：刷新按钮强制重拉参考数据
const loadData = async (force = false) => {
  await Promise.all([reload(), refData.ensure(['owners', 'locations', 'materials'], { force })])
}

const exporting = ref(false)
const exportList = async () => {
  exporting.value = true
  try {
    await downloadFile(EXPORT_URLS.inventoryTxn, { data: currentParams(), fallbackName: '库存流水.xlsx' })
  } catch (e) {
    // 错误已提示
  } finally {
    exporting.value = false
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.list-summary {
  font-size: 13px;
  color: var(--brand-text-secondary);
}
</style>
