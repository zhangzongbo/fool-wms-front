<template>
  <div class="page-container">
    <PageHeader subtitle="按货主 / SKU / 批次 / 库位维度的实时库存，受数据范围隔离" />

    <SearchPanel :model="query" :action-span="7" @search="search" @reset="reset">
      <el-col :xs="24" :sm="12" :md="8" :lg="6"
        ><el-form-item label="货主"
          ><el-select
            v-model="query.ownerId"
            placeholder="全部货主"
            clearable
            filterable
            style="width: 100%"
            @change="search"
          >
            <el-option v-for="o in owners" :key="o.id" :label="o.ownerName" :value="o.id" /></el-select></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="6"
        ><el-form-item label="商品编码/名称"
          ><el-input v-model="query.keyword" placeholder="商品编码或名称，回车查询" clearable /></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="5"
        ><el-form-item label="批次号"
          ><el-input v-model="query.batchNo" placeholder="批次号，回车查询" clearable /></el-form-item
      ></el-col>
    </SearchPanel>

    <el-card class="table-card">
      <TableToolbar :loading="loading" @refresh="loadData(true)">
        <template #settings><ColumnSettings :cols="cols" /></template>
        <template #actions>
          <el-button v-perm="'sys:inventory:export'" :icon="Download" :loading="exporting" @click="exportList"
            >导出</el-button
          >
        </template>
        <template #left>
          <!-- 汇总由后端按相同筛选条件计算（summary），不受分页影响 -->
          <span class="list-summary">
            共 {{ total }} 条 · 可用合计 {{ formatQty(summary.totalQuantity) }} · 冻结
            {{ formatQty(summary.totalFrozen) }} · 无可用
            <span :class="{ 'text-danger': Number(summary.zeroAvailableCount) > 0 }">{{
              dash(summary.zeroAvailableCount)
            }}</span>
          </span>
        </template>
      </TableToolbar>
      <el-table v-loading="loading" :data="list" stripe border @header-dragend="cols.onDragEnd">
        <el-table-column
          column-key="index"
          type="index"
          :index="rowIndex(page)"
          label="#"
          :width="cols.width('index', 60)"
          align="center"
        />
        <el-table-column
          v-if="cols.visible('owner')"
          column-key="owner"
          label="货主"
          min-width="140"
          :width="cols.width('owner')"
          show-overflow-tooltip
          ><template #default="{ row }">{{ ownerName(row.ownerId) }}</template></el-table-column
        >
        <el-table-column
          column-key="productCode"
          prop="productCode"
          label="商品编码"
          min-width="130"
          :width="cols.width('productCode')"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column
          v-if="cols.visible('productName')"
          column-key="productName"
          prop="productName"
          label="商品名称"
          min-width="160"
          :width="cols.width('productName')"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column
          v-if="cols.visible('batchNo')"
          column-key="batchNo"
          prop="batchNo"
          label="批次号"
          min-width="120"
          :width="cols.width('batchNo')"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column
          v-if="cols.visible('location')"
          column-key="location"
          prop="locationCode"
          label="库位"
          min-width="110"
          :width="cols.width('location')"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column
          v-if="cols.visible('onHand')"
          column-key="onHand"
          label="在库量"
          :width="cols.width('onHand', 110)"
          align="right"
          class-name="num"
        >
          <template #default="{ row }">{{ formatQty(onHand(row)) }}</template>
        </el-table-column>
        <el-table-column
          v-if="cols.visible('frozen')"
          column-key="frozen"
          label="冻结量"
          :width="cols.width('frozen', 110)"
          align="right"
          class-name="num"
        >
          <template #default="{ row }"
            ><span :class="{ 'text-warning': num(row.frozenQuantity) > 0 }">{{
              formatQty(row.frozenQuantity)
            }}</span></template
          >
        </el-table-column>
        <el-table-column
          v-if="cols.visible('available')"
          column-key="available"
          label="可用量"
          :width="cols.width('available', 110)"
          align="right"
          class-name="num"
        >
          <template #default="{ row }"
            ><span :class="available(row) <= 0 ? 'text-danger' : 'text-success'">{{
              formatQty(available(row))
            }}</span></template
          >
        </el-table-column>
        <el-table-column
          v-if="cols.visible('unit')"
          column-key="unit"
          prop="unit"
          label="单位"
          :width="cols.width('unit', 70)"
          align="center"
          :formatter="tableDash"
        />
        <el-table-column
          column-key="action"
          label="操作"
          :width="cols.width('action', 80)"
          fixed="right"
          align="center"
        >
          <template #default="{ row }"><RowActions :actions="rowActions(row)" /></template>
        </el-table-column>
      </el-table>
      <ListPagination v-model:current="page.current" v-model:size="page.size" :total="total" @change="reload" />
    </el-card>
  </div>
</template>

<script setup>
import { Download } from '@element-plus/icons-vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PageHeader from '@/components/list-page/PageHeader.vue'
import SearchPanel from '@/components/list-page/SearchPanel.vue'
import TableToolbar from '@/components/list-page/TableToolbar.vue'
import ColumnSettings from '@/components/list-page/ColumnSettings.vue'
import ListPagination from '@/components/list-page/ListPagination.vue'
import RowActions from '@/components/RowActions.vue'
import { inventoryApi, EXPORT_URLS } from '@/api'
import { useServerList } from '@/composables/useServerList'
import { useTableColumns } from '@/composables/useTableColumns'
import { downloadFile } from '@/utils/download'
import { dash, tableDash, formatQty, rowIndex, recentDays } from '@/utils/format'
import { useRefDataStore } from '@/stores/refData'

// 列设置（显示 / 隐藏、拖动列宽）：按用户记在本地；序号、编码、状态、操作为固定列不可隐藏；列定义变化时 version 加 1
const cols = useTableColumns(
  'inventory',
  [
    { key: 'index', label: '序号', fixed: true },
    { key: 'owner', label: '货主' },
    { key: 'productCode', label: '商品编码', fixed: true },
    { key: 'productName', label: '商品名称' },
    { key: 'batchNo', label: '批次号' },
    { key: 'location', label: '库位' },
    { key: 'onHand', label: '在库量' },
    { key: 'frozen', label: '冻结量' },
    { key: 'available', label: '可用量' },
    { key: 'unit', label: '单位' },
    { key: 'action', label: '操作', fixed: true }
  ],
  { version: 2 }
)

const refData = useRefDataStore()
const { owners } = storeToRefs(refData)

// 服务端分页；keyword 匹配商品编码 + 名称，batchNo 模糊匹配
const { query, page, list, total, extra, loading, search, reset, reload, currentParams } = useServerList(
  (p) => inventoryApi.page(p),
  {
    keyword: '',
    ownerId: null,
    batchNo: ''
  }
)
// 后端 summary 缺失时各项显示 "-"
const summary = computed(() => extra.value.summary || {})

const num = (v) => Number(v ?? 0)
// quantity 即可用量：冻结时后端把数量从 quantity 移到 frozenQuantity（InventoryServiceImpl.freezeInventory），
// 所以在库量 = 可用 + 冻结，可用量不能再减冻结
const available = (row) => num(row.quantity)
const onHand = (row) => num(row.quantity) + num(row.frozenQuantity)
// 货主不在当前缓存中时显示 #id，便于排查
const ownerName = (id) => {
  if (!id) return '-'
  const name = refData.ownerName(id)
  return name === '-' ? `#${id}` : name
}

// 行操作：查看该库存维度最近 90 天的流水（spec #16 Q-G）
const router = useRouter()
const rowActions = (row) => {
  const [startDate, endDate] = recentDays(90)
  const q = { startDate, endDate, ownerId: row.ownerId, skuId: row.skuId, locationId: row.locationId }
  if (row.batchNo) q.batchNo = row.batchNo
  return [
    {
      label: '流水',
      perm: 'sys:inventory:txn',
      onClick: () => router.push({ path: '/inventory/transactions', query: q })
    }
  ]
}

// force：刷新按钮强制重拉参考数据
const loadData = async (force = false) => {
  await Promise.all([reload(), refData.ensure(['owners'], { force })])
}

// 按当前筛选导出（服务端流式写出，上限与权限由后端控制）
const exporting = ref(false)
const exportList = async () => {
  exporting.value = true
  try {
    await downloadFile(EXPORT_URLS.inventory, { data: currentParams(), fallbackName: '库存.xlsx' })
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
