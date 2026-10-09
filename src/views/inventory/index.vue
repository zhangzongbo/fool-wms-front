<template>
  <div class="page-container">
    <PageHeader subtitle="按货主 / SKU / 批次 / 库位维度的实时库存，受数据范围隔离" />

    <SearchPanel :model="query" :action-span="7" @search="search" @reset="reset">
      <el-col :span="6"
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
      <el-col :span="6"
        ><el-form-item label="商品编码/名称"
          ><el-input v-model="query.keyword" placeholder="商品编码或名称，回车查询" clearable /></el-form-item
      ></el-col>
      <el-col :span="5"
        ><el-form-item label="批次号"
          ><el-input v-model="query.batchNo" placeholder="批次号，回车查询" clearable /></el-form-item
      ></el-col>
    </SearchPanel>

    <el-card class="table-card">
      <TableToolbar :loading="loading" @refresh="loadData(true)">
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
      <el-table v-loading="loading" :data="list" stripe border>
        <el-table-column type="index" :index="rowIndex(page)" label="#" width="60" align="center" />
        <el-table-column label="货主" min-width="140" show-overflow-tooltip
          ><template #default="{ row }">{{ ownerName(row.ownerId) }}</template></el-table-column
        >
        <el-table-column
          prop="productCode"
          label="商品编码"
          min-width="130"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column
          prop="productName"
          label="商品名称"
          min-width="160"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column prop="batchNo" label="批次号" min-width="120" show-overflow-tooltip :formatter="tableDash" />
        <el-table-column
          prop="locationCode"
          label="库位"
          min-width="110"
          show-overflow-tooltip
          :formatter="tableDash"
        />
        <el-table-column label="在库量" width="110" align="right" class-name="num">
          <template #default="{ row }">{{ formatQty(onHand(row)) }}</template>
        </el-table-column>
        <el-table-column label="冻结量" width="110" align="right" class-name="num">
          <template #default="{ row }"
            ><span :class="{ 'text-warning': num(row.frozenQuantity) > 0 }">{{
              formatQty(row.frozenQuantity)
            }}</span></template
          >
        </el-table-column>
        <el-table-column label="可用量" width="110" align="right" class-name="num">
          <template #default="{ row }"
            ><span :class="available(row) <= 0 ? 'text-danger' : 'text-success'">{{
              formatQty(available(row))
            }}</span></template
          >
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="70" align="center" :formatter="tableDash" />
      </el-table>
      <ListPagination v-model:current="page.current" v-model:size="page.size" :total="total" @change="reload" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import PageHeader from '@/components/list-page/PageHeader.vue'
import SearchPanel from '@/components/list-page/SearchPanel.vue'
import TableToolbar from '@/components/list-page/TableToolbar.vue'
import ListPagination from '@/components/list-page/ListPagination.vue'
import { inventoryApi } from '@/api'
import { useServerList } from '@/composables/useServerList'
import { dash, tableDash, formatQty, rowIndex } from '@/utils/format'
import { useRefDataStore } from '@/stores/refData'

const refData = useRefDataStore()
const { owners } = storeToRefs(refData)

// 服务端分页；keyword 匹配商品编码 + 名称，batchNo 模糊匹配
const { query, page, list, total, extra, loading, search, reset, reload } = useServerList((p) => inventoryApi.page(p), {
  keyword: '',
  ownerId: null,
  batchNo: ''
})
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

// force：刷新按钮强制重拉参考数据
const loadData = async (force = false) => {
  await Promise.all([reload(), refData.ensure(['owners'], { force })])
}

onMounted(() => loadData())
</script>

<style scoped>
.list-summary {
  font-size: 13px;
  color: var(--brand-text-secondary);
}
</style>
