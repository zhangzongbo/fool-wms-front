<template>
  <div class="page-container">
    <PageHeader subtitle="入库单全流程：草稿 → 审核 → 完成入库（驱动库存增加并写流水）">
      <template #actions>
        <el-button v-perm="'sys:inbound:add'" type="primary" :icon="Plus" @click="goNew">新增入库单</el-button>
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
        <template #actions>
          <el-button v-perm="'sys:inbound:export'" :icon="Download" :loading="exporting" @click="exportList"
            >导出</el-button
          >
        </template>
        <template #left>
          <StatusTabs v-model="query.status" :options="INBOUND_STATUS" :counts="extra.statusCounts" @change="search" />
        </template>
      </TableToolbar>
      <el-table v-loading="loading" :data="list" stripe border>
        <el-table-column type="index" :index="rowIndex(page)" label="#" width="60" align="center" fixed="left" />
        <el-table-column label="入库单号" min-width="170" fixed="left" show-overflow-tooltip>
          <template #default="{ row }"
            ><el-link type="primary" underline="never" @click="goDetail(row)">{{ row.inboundCode }}</el-link></template
          >
        </el-table-column>
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
        <el-table-column
          prop="expectedArrivalDate"
          label="预计到货"
          width="110"
          align="center"
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Plus, Download } from '@element-plus/icons-vue'
import PageHeader from '@/components/list-page/PageHeader.vue'
import SearchPanel from '@/components/list-page/SearchPanel.vue'
import TableToolbar from '@/components/list-page/TableToolbar.vue'
import ListPagination from '@/components/list-page/ListPagination.vue'
import StatusTabs from '@/components/list-page/StatusTabs.vue'
import RowActions from '@/components/RowActions.vue'
import { inboundApi, EXPORT_URLS } from '@/api'
import { useServerList } from '@/composables/useServerList'
import { downloadFile } from '@/utils/download'
import { useOrderActions } from '@/composables/useOrderActions'
import { formatDateTime } from '@/utils'
import { dash, tableDash, formatQty, rowIndex } from '@/utils/format'
import { useRefDataStore } from '@/stores/refData'
import { INBOUND_STATUS, INBOUND_TYPE, dictLabel, dictType, optionLabel } from '@/constants/dict'

const router = useRouter()
const refData = useRefDataStore()
const { owners, warehouses } = storeToRefs(refData)
const { ownerName, warehouseName } = refData

// 服务端分页；状态由页签控制，计数随其他筛选条件变化（后端 statusCounts）
const { query, page, list, total, extra, loading, search, reset, reload, currentParams } = useServerList(
  (p) => inboundApi.page(p),
  {
    keyword: '',
    warehouseId: null,
    ownerId: null,
    status: ''
  }
)

// force：刷新按钮强制重拉参考数据
const loadData = async (force = false) => {
  await Promise.all([reload(), refData.ensure(['owners', 'warehouses'], { force })])
}

// 新建 / 详情 / 编辑为独立页面（spec #14），列表筛选保留在 URL 中，返回时恢复
const goNew = () => router.push('/inbound/new')
const goDetail = (row) => router.push(`/inbound/${row.id}`)
const { actionsOf: rowActions } = useOrderActions('inbound', {
  onChanged: reload,
  onView: goDetail,
  onEdit: (row) => router.push(`/inbound/${row.id}/edit`)
})

// 按当前筛选导出（服务端流式写出，上限与权限由后端控制）
const exporting = ref(false)
const exportList = async () => {
  exporting.value = true
  try {
    await downloadFile(EXPORT_URLS.inbound, { data: currentParams(), fallbackName: '入库单.xlsx' })
  } catch (e) {
    // 错误已提示
  } finally {
    exporting.value = false
  }
}

onMounted(() => loadData())
</script>
