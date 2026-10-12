<template>
  <div class="page-container">
    <PageHeader subtitle="人工修正库存的唯一入口：草稿 → 提交 → 审批（审批即调整库存，创建人不能审批自己的单）">
      <template #actions>
        <el-button v-perm="'sys:adjust:add'" type="primary" :icon="Plus" @click="goNew">新增调整单</el-button>
      </template>
    </PageHeader>

    <SearchPanel :model="query" :action-span="8" @search="search" @reset="reset">
      <el-col :xs="24" :sm="12" :md="8" :lg="6"
        ><el-form-item label="调整单号"
          ><el-input v-model="query.keyword" placeholder="调整单号，回车查询" clearable /></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="5"
        ><el-form-item label="仓库"
          ><el-select v-model="query.warehouseId" placeholder="全部" clearable style="width: 100%" @change="search">
            <el-option
              v-for="w in warehouses"
              :key="w.id"
              :label="w.warehouseName"
              :value="w.id" /></el-select></el-form-item
      ></el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="5"
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
      <el-col :xs="24" :sm="12" :md="8" :lg="4"
        ><el-form-item label="调整类型"
          ><el-select v-model="query.adjustType" placeholder="全部" clearable style="width: 100%" @change="search">
            <el-option
              v-for="t in ADJUST_TYPE"
              :key="t.value"
              :label="t.label"
              :value="t.value" /></el-select></el-form-item
      ></el-col>
    </SearchPanel>

    <el-card class="table-card">
      <TableToolbar :loading="loading" @refresh="loadData(true)">
        <template #settings><ColumnSettings :cols="cols" /></template>
        <template #actions>
          <el-button v-perm="'sys:adjust:export'" :icon="Download" :loading="exporting" @click="exportList"
            >导出</el-button
          >
        </template>
        <template #left>
          <StatusTabs v-model="query.status" :options="ADJUST_STATUS" :counts="extra.statusCounts" @change="search" />
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
          fixed="left"
        />
        <el-table-column
          column-key="code"
          label="调整单号"
          min-width="170"
          :width="cols.width('code')"
          fixed="left"
          show-overflow-tooltip
        >
          <template #default="{ row }"
            ><el-link type="primary" underline="never" @click="goDetail(row)">{{ row.adjustCode }}</el-link></template
          >
        </el-table-column>
        <el-table-column
          column-key="status"
          label="状态"
          :width="cols.width('status', 100)"
          align="center"
          fixed="left"
        >
          <template #default="{ row }"
            ><el-tag :type="dictType(ADJUST_STATUS, row.status)">{{
              dictLabel(ADJUST_STATUS, row.status)
            }}</el-tag></template
          >
        </el-table-column>
        <el-table-column
          v-if="cols.visible('owner')"
          column-key="owner"
          label="货主"
          min-width="130"
          :width="cols.width('owner')"
          show-overflow-tooltip
          ><template #default="{ row }">{{ ownerName(row.ownerId) }}</template></el-table-column
        >
        <el-table-column
          v-if="cols.visible('warehouse')"
          column-key="warehouse"
          label="仓库"
          min-width="150"
          :width="cols.width('warehouse')"
          show-overflow-tooltip
          ><template #default="{ row }">{{ warehouseName(row.warehouseId) }}</template></el-table-column
        >
        <el-table-column
          v-if="cols.visible('type')"
          column-key="type"
          label="调整类型"
          :width="cols.width('type', 100)"
          align="center"
          ><template #default="{ row }">{{ optionLabel(ADJUST_TYPE, row.adjustType) }}</template></el-table-column
        >
        <el-table-column
          v-if="cols.visible('summary')"
          column-key="summary"
          label="明细 / 调增 / 调减"
          :width="cols.width('summary', 150)"
          align="right"
          class-name="num"
          ><template #default="{ row }"
            >{{ row.itemCount }} / <span class="text-success">+{{ formatQty(row.increaseQuantity) }}</span> /
            <span class="text-danger">-{{ formatQty(row.decreaseQuantity) }}</span></template
          ></el-table-column
        >
        <el-table-column
          v-if="cols.visible('creator')"
          column-key="creator"
          label="创建人"
          min-width="100"
          :width="cols.width('creator')"
          show-overflow-tooltip
          ><template #default="{ row }">{{ dash(row.createByName) }}</template></el-table-column
        >
        <el-table-column
          v-if="cols.visible('createTime')"
          column-key="createTime"
          label="创建时间"
          :width="cols.width('createTime', 160)"
          align="center"
          ><template #default="{ row }">{{ formatDateTime(row.createTime) }}</template></el-table-column
        >
        <el-table-column
          v-if="cols.visible('approver')"
          column-key="approver"
          label="审批人"
          min-width="100"
          :width="cols.width('approver')"
          show-overflow-tooltip
          ><template #default="{ row }">{{ dash(row.approveByName) }}</template></el-table-column
        >
        <el-table-column
          v-if="cols.visible('approveTime')"
          column-key="approveTime"
          label="审批时间"
          :width="cols.width('approveTime', 160)"
          align="center"
          ><template #default="{ row }">{{ formatDateTime(row.approveTime) }}</template></el-table-column
        >
        <el-table-column
          v-if="cols.visible('remark')"
          column-key="remark"
          label="备注"
          min-width="150"
          :width="cols.width('remark')"
          show-overflow-tooltip
          ><template #default="{ row }"
            ><span v-if="row.rejectReason" class="text-danger">驳回：{{ row.rejectReason }}</span
            ><template v-else>{{ dash(row.remark) }}</template></template
          ></el-table-column
        >
        <el-table-column
          column-key="action"
          label="操作"
          :width="cols.width('action', 190)"
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Plus, Download } from '@element-plus/icons-vue'
import PageHeader from '@/components/list-page/PageHeader.vue'
import SearchPanel from '@/components/list-page/SearchPanel.vue'
import TableToolbar from '@/components/list-page/TableToolbar.vue'
import ColumnSettings from '@/components/list-page/ColumnSettings.vue'
import ListPagination from '@/components/list-page/ListPagination.vue'
import StatusTabs from '@/components/list-page/StatusTabs.vue'
import RowActions from '@/components/RowActions.vue'
import { adjustApi, EXPORT_URLS } from '@/api'
import { useServerList } from '@/composables/useServerList'
import { useTableColumns } from '@/composables/useTableColumns'
import { downloadFile } from '@/utils/download'
import { useOrderActions } from '@/composables/useOrderActions'
import { formatDateTime } from '@/utils'
import { dash, formatQty, rowIndex } from '@/utils/format'
import { useRefDataStore } from '@/stores/refData'
import { ADJUST_STATUS, ADJUST_TYPE, dictLabel, dictType, optionLabel } from '@/constants/dict'

/**
 * 库存调整单列表（spec #16）：服务端分页、状态页签、筛选同步 URL、列设置、导出；新建 / 详情 / 编辑走通用单据页
 */
const cols = useTableColumns('adjust', [
  { key: 'index', label: '序号', fixed: true },
  { key: 'code', label: '调整单号', fixed: true },
  { key: 'status', label: '状态', fixed: true },
  { key: 'owner', label: '货主' },
  { key: 'warehouse', label: '仓库' },
  { key: 'type', label: '调整类型' },
  { key: 'summary', label: '明细 / 调增 / 调减' },
  { key: 'creator', label: '创建人' },
  { key: 'createTime', label: '创建时间' },
  { key: 'approver', label: '审批人' },
  { key: 'approveTime', label: '审批时间' },
  { key: 'remark', label: '备注' },
  { key: 'action', label: '操作', fixed: true }
])

const router = useRouter()
const refData = useRefDataStore()
const { owners, warehouses } = storeToRefs(refData)
const { ownerName, warehouseName } = refData

const { query, page, list, total, extra, loading, search, reset, reload, currentParams } = useServerList(
  (p) => adjustApi.page(p),
  {
    keyword: '',
    warehouseId: null,
    ownerId: null,
    adjustType: '',
    status: ''
  }
)

// force：刷新按钮强制重拉参考数据
const loadData = async (force = false) => {
  await Promise.all([reload(), refData.ensure(['owners', 'warehouses'], { force })])
}

const goNew = () => router.push('/adjust/new')
const goDetail = (row) => router.push(`/adjust/${row.id}`)
const { actionsOf: rowActions } = useOrderActions('adjust', {
  onChanged: reload,
  onView: goDetail,
  onEdit: (row) => router.push(`/adjust/${row.id}/edit`)
})

const exporting = ref(false)
const exportList = async () => {
  exporting.value = true
  try {
    await downloadFile(EXPORT_URLS.adjust, { data: currentParams(), fallbackName: '库存调整单.xlsx' })
  } catch (e) {
    // 错误已提示
  } finally {
    exporting.value = false
  }
}

onMounted(() => loadData())
</script>
