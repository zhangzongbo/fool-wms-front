<template>
  <div v-loading="loading" class="page-container">
    <PageHeader :title="order ? `${cfg.label} ${order[cfg.codeKey]}` : cfg.label" :subtitle="subtitle">
      <template #actions>
        <el-button @click="goBack">返回</el-button>
        <template v-if="cfg.kind !== 'check'">
          <el-button v-perm="cfg.perm('list')" :icon="Printer" :disabled="!order" @click="printPdf('ORDER')"
            >打印</el-button
          >
          <el-button
            v-if="order?.status === 'ALLOCATED'"
            v-perm="cfg.perm('list')"
            :icon="Printer"
            @click="printPdf('PICKING')"
            >拣货单</el-button
          >
          <el-button v-perm="cfg.perm('list')" :icon="Download" :disabled="!order" @click="downloadPdf"
            >下载 PDF</el-button
          >
        </template>
        <el-button
          v-for="a in visibleActions"
          :key="a.label"
          :type="a.danger ? 'danger' : 'primary'"
          :plain="a.danger || a.label === '编辑'"
          @click="a.onClick()"
          >{{ a.label }}</el-button
        >
      </template>
    </PageHeader>

    <template v-if="order">
      <el-card class="form-card">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="单号">{{ order[cfg.codeKey] }}</el-descriptions-item>
          <el-descriptions-item label="状态"
            ><el-tag :type="dictType(cfg.statusDict, order.status)">{{
              dictLabel(cfg.statusDict, order.status)
            }}</el-tag></el-descriptions-item
          >
          <el-descriptions-item label="类型">{{ optionLabel(cfg.typeDict, order[cfg.typeKey]) }}</el-descriptions-item>
          <el-descriptions-item label="仓库">{{ dash(order.warehouseName) }}</el-descriptions-item>
          <el-descriptions-item label="货主">{{ dash(order.ownerName) }}</el-descriptions-item>
          <el-descriptions-item v-if="cfg.party" :label="cfg.party.label">{{
            dash(order[cfg.party.key])
          }}</el-descriptions-item>
          <el-descriptions-item v-if="cfg.expectedDate" :label="cfg.expectedDate.label">{{
            dash(order[cfg.expectedDate.key])
          }}</el-descriptions-item>
          <el-descriptions-item v-if="cfg.kind === 'check'" label="库区">{{
            order.areaId ? dash(order.areaName) : '整仓'
          }}</el-descriptions-item>
          <el-descriptions-item label="创建"
            >{{ dash(order.createByName) }} · {{ formatDateTime(order.createTime) }}</el-descriptions-item
          >
          <el-descriptions-item label="最后修改"
            >{{ dash(order.updateByName) }} · {{ formatDateTime(order.updateTime) }}</el-descriptions-item
          >
          <el-descriptions-item label="备注" :span="3">{{ dash(order.remark) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="table-card">
        <el-tabs v-model="tab">
          <el-tab-pane :label="`明细（${lines.length}）`" name="lines">
            <el-table :data="lines" border size="small" show-summary :summary-method="summary">
              <el-table-column type="index" label="#" width="50" align="center" />
              <el-table-column prop="productCode" label="物料编码" min-width="120" show-overflow-tooltip />
              <el-table-column
                v-if="cfg.kind !== 'check'"
                prop="productName"
                label="物料名称"
                min-width="140"
                show-overflow-tooltip
                :formatter="tableDash"
              />
              <el-table-column v-if="cfg.kind !== 'check'" prop="unit" label="单位" width="70" align="center" />
              <el-table-column
                v-if="cfg.kind !== 'check'"
                prop="quantity"
                label="数量"
                width="100"
                align="right"
                class-name="num"
                :formatter="tableQty"
              />
              <el-table-column label="库位" min-width="110" show-overflow-tooltip>
                <template #default="{ row }">{{ row.locationCode || locationCode(row.locationId) }}</template>
              </el-table-column>
              <el-table-column prop="batchNo" label="批次" min-width="100" :formatter="tableDash" />
              <el-table-column v-if="cfg.kind === 'inbound'" label="效期" width="110">
                <template #default="{ row }">{{ row.expireDate ? String(row.expireDate).slice(0, 10) : '-' }}</template>
              </el-table-column>
              <template v-if="cfg.kind === 'check'">
                <el-table-column label="账面量" width="100" align="right" class-name="num">
                  <template #default="{ row }">{{
                    order.status === 'DRAFT' ? '待快照' : formatQty(row.systemQty)
                  }}</template>
                </el-table-column>
                <el-table-column label="实盘量" width="100" align="right" class-name="num">
                  <template #default="{ row }">{{
                    row.actualQty == null ? '未盘' : formatQty(row.actualQty)
                  }}</template>
                </el-table-column>
                <el-table-column label="差异" width="100" align="right" class-name="num">
                  <template #default="{ row }"
                    ><span :class="diffClass(row)">{{ diffText(row) }}</span></template
                  >
                </el-table-column>
              </template>
              <el-table-column
                prop="remark"
                label="备注"
                min-width="120"
                show-overflow-tooltip
                :formatter="tableDash"
              />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="状态记录" name="logs">
            <StatusTimeline :logs="logs" :status-dict="cfg.statusDict" :order="order" />
          </el-tab-pane>
          <el-tab-pane :label="`库存流水（${transactions.length}）`" name="txn">
            <el-table :data="transactions" border size="small" empty-text="该单据尚未驱动库存变动">
              <el-table-column label="时间" width="150"
                ><template #default="{ row }">{{ formatDateTime(row.createTime) }}</template></el-table-column
              >
              <el-table-column label="类型" width="80" align="center"
                ><template #default="{ row }">{{ TXN_LABELS[row.txnType] || row.txnType }}</template></el-table-column
              >
              <el-table-column prop="productCode" label="物料编码" min-width="110" />
              <el-table-column label="库位" min-width="100"
                ><template #default="{ row }">{{ locationCode(row.locationId) }}</template></el-table-column
              >
              <el-table-column prop="batchNo" label="批次" min-width="90" :formatter="tableDash" />
              <el-table-column
                prop="changeQty"
                label="可用变动"
                width="100"
                align="right"
                class-name="num"
                :formatter="tableQty"
              />
              <el-table-column label="可用（前 → 后）" width="140" align="right" class-name="num"
                ><template #default="{ row }"
                  >{{ formatQty(row.beforeQty) }} → {{ formatQty(row.afterQty) }}</template
                ></el-table-column
              >
              <el-table-column label="冻结（前 → 后）" width="140" align="right" class-name="num"
                ><template #default="{ row }"
                  >{{ formatQty(row.beforeFrozen) }} → {{ formatQty(row.afterFrozen) }}</template
                ></el-table-column
              >
              <el-table-column prop="createByName" label="操作人" width="100" :formatter="tableDash" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Printer, Download } from '@element-plus/icons-vue'
import PageHeader from '@/components/list-page/PageHeader.vue'
import StatusTimeline from '@/components/order/StatusTimeline.vue'
import { useRefDataStore } from '@/stores/refData'
import { useUserStore } from '@/stores/user'
import { useOrderActions } from '@/composables/useOrderActions'
import { formatDateTime } from '@/utils'
import { dash, tableDash, formatQty, tableQty } from '@/utils/format'
import { downloadFile, openPdf } from '@/utils/download'
import { pdfUrl } from '@/api'
import { dictLabel, dictType, optionLabel } from '@/constants/dict'
import { listLocation } from '@/router/listMemory'
import { ORDER_KINDS } from './orderKinds'

/**
 * 单据详情页（可分享 URL）：单头、明细、状态记录（t_doc_status_log）、库存流水；操作按钮与列表行操作同源
 */
const props = defineProps({ kind: { type: String, required: true } })
const cfg = ORDER_KINDS[props.kind]

const route = useRoute()
const router = useRouter()
const refData = useRefDataStore()
const userStore = useUserStore()
const { locationCode } = refData

const loading = ref(false)
const order = ref(null)
const logs = ref([])
const transactions = ref([])
const tab = ref('lines')
const lines = computed(() => order.value?.lines || [])
const id = computed(() => Number(route.params.id))

const TXN_LABELS = { IN: '入库', OUT: '出库', FREEZE: '冻结', RELEASE: '释放', ADJUST: '调整', MOVE: '移库' }
const subtitle = computed(() =>
  order.value?.status === 'DRAFT'
    ? '草稿可编辑；审核后明细不可再修改'
    : '操作记录见「状态记录」，库存变动见「库存流水」'
)

const load = async () => {
  loading.value = true
  try {
    const [vo, logList, txns] = await Promise.all([
      cfg.api.view(id.value),
      cfg.api.logs(id.value).catch(() => []),
      cfg.api.transactions(id.value).catch(() => []),
      refData.ensure(cfg.refKeys)
    ])
    order.value = vo
    logs.value = logList || []
    transactions.value = txns || []
  } catch (e) {
    // 不存在或无权访问：错误提示已由请求拦截器处理
  } finally {
    loading.value = false
  }
}

const backToList = () => router.push(listLocation(cfg.listPath))
const goBack = () => (window.history.state?.back ? router.back() : backToList())

const { actionsOf } = useOrderActions(cfg.kind, {
  onChanged: load,
  onDeleted: backToList,
  onEdit: (o) => router.push(`${cfg.listPath}/${o.id}/edit`)
})
const visibleActions = computed(() =>
  order.value ? actionsOf(order.value).filter((a) => a.show !== false && userStore.hasPermission(a.perm)) : []
)

const printPdf = (kind) => openPdf(pdfUrl(cfg.kind, id.value), { kind }).catch(() => {})
const downloadPdf = () =>
  downloadFile(pdfUrl(cfg.kind, id.value), {
    method: 'get',
    params: { kind: 'ORDER' },
    fallbackName: `${order.value[cfg.codeKey]}.pdf`
  }).catch(() => {})

// 盘点差异
const diffOf = (row) => (row.actualQty == null ? null : Number(row.actualQty) - Number(row.systemQty || 0))
const diffText = (row) => {
  const d = diffOf(row)
  if (d == null || order.value?.status === 'DRAFT') return '-'
  return d > 0 ? `+${formatQty(d)}` : formatQty(d)
}
const diffClass = (row) => {
  const d = diffOf(row)
  return d > 0 ? 'text-success' : d < 0 ? 'text-danger' : ''
}

// 合计行：数量列求和，其余留空
const summary = ({ columns, data }) =>
  columns.map((col, i) => {
    if (i === 0) return '合计'
    if (col.property === 'quantity') return formatQty(data.reduce((s, r) => s + (Number(r.quantity) || 0), 0))
    return ''
  })

watch(id, (v) => v && load(), { immediate: true })
</script>
