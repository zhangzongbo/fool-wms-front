<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-title">
        <h2>仪表盘</h2>
        <p class="page-subtitle">仓储运营全景概览 · 实时数据</p>
      </div>
      <div class="header-actions">
        <el-button :loading="loading" @click="loadData"
          ><el-icon><Refresh /></el-icon> 刷新</el-button
        >
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6"
        ><div class="stat-card" @click="go('/owner')">
          <div class="stat-content">
            <div class="stat-icon" style="background: #e8f1fd">
              <el-icon color="#1765ad"><User /></el-icon>
            </div>
            <div class="stat-text">
              <div class="stat-value">{{ stats.owner }}</div>
              <div class="stat-label">合作货主</div>
            </div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card" @click="go('/warehouse')">
          <div class="stat-content">
            <div class="stat-icon" style="background: #e8f6ee">
              <el-icon color="#34a853"><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-text">
              <div class="stat-value">{{ stats.warehouse }}</div>
              <div class="stat-label">仓库节点</div>
            </div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card" @click="go('/inventory')">
          <div class="stat-content">
            <div class="stat-icon" style="background: #fff4e6">
              <el-icon color="#f59e0b"><Box /></el-icon>
            </div>
            <div class="stat-text">
              <div class="stat-value">{{ stats.inventory }}</div>
              <div class="stat-label">库存记录</div>
            </div>
          </div>
        </div></el-col
      >
      <el-col :span="6"
        ><div class="stat-card danger">
          <div class="stat-content">
            <div class="stat-icon" style="background: #fdecec">
              <el-icon color="#f56c6c"><Bell /></el-icon>
            </div>
            <div class="stat-text">
              <div class="stat-value">{{ stats.todo }}</div>
              <div class="stat-label">待处理作业</div>
            </div>
          </div>
        </div></el-col
      >
    </el-row>

    <el-row :gutter="16">
      <!-- 作业待办 -->
      <el-col :span="14">
        <el-card class="panel-card">
          <template #header
            ><div class="panel-header">
              <span>作业状态分布</span><el-tag size="small" effect="plain">按状态</el-tag>
            </div></template
          >
          <v-chart v-if="!loading" class="chart" :option="chartOption" autoresize />
          <el-skeleton v-else :rows="5" animated />
        </el-card>
      </el-col>

      <!-- 待办清单 -->
      <el-col :span="10">
        <el-card class="panel-card">
          <template #header
            ><div class="panel-header"><span>待办事项</span></div></template
          >
          <div class="todo-list">
            <div class="todo-item" @click="go('/inbound')">
              <div class="todo-left">
                <el-icon color="#1765ad"><Download /></el-icon><span>入库单待完成</span>
              </div>
              <el-badge :value="todo.inbound" :max="99" type="primary" :show-zero="false" />
            </div>
            <div class="todo-item" @click="go('/outbound')">
              <div class="todo-left">
                <el-icon color="#f59e0b"><Coordinate /></el-icon><span>出库单待分配</span>
              </div>
              <el-badge :value="todo.allocate" :max="99" type="warning" :show-zero="false" />
            </div>
            <div class="todo-item" @click="go('/outbound')">
              <div class="todo-left">
                <el-icon color="#34a853"><Upload /></el-icon><span>出库单待发货</span>
              </div>
              <el-badge :value="todo.outbound" :max="99" type="success" :show-zero="false" />
            </div>
            <div class="todo-item" @click="go('/check')">
              <div class="todo-left">
                <el-icon color="#f56c6c"><DocumentChecked /></el-icon><span>盘点单待过账</span>
              </div>
              <el-badge :value="todo.check" :max="99" type="danger" :show-zero="false" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :span="12">
        <el-card class="panel-card">
          <template #header
            ><div class="panel-header">
              <span>近期入库单</span
              ><el-link type="primary" :underline="false" @click="go('/inbound')">查看全部</el-link>
            </div></template
          >
          <el-table :data="recentInbound" size="small">
            <el-table-column prop="inboundCode" label="单号" min-width="150" show-overflow-tooltip />
            <el-table-column prop="supplierName" label="供应商" min-width="120" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }"
                ><el-tag size="small" :type="dictType(INBOUND_STATUS, row.status)">{{
                  dictLabel(INBOUND_STATUS, row.status)
                }}</el-tag></template
              >
            </el-table-column>
          </el-table>
          <el-empty v-if="!recentInbound.length" description="暂无入库单" :image-size="60" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="panel-card">
          <template #header
            ><div class="panel-header">
              <span>近期出库单</span
              ><el-link type="primary" :underline="false" @click="go('/outbound')">查看全部</el-link>
            </div></template
          >
          <el-table :data="recentOutbound" size="small">
            <el-table-column prop="outboundCode" label="单号" min-width="150" show-overflow-tooltip />
            <el-table-column prop="customerName" label="客户" min-width="120" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }"
                ><el-tag size="small" :type="dictType(OUTBOUND_STATUS, row.status)">{{
                  dictLabel(OUTBOUND_STATUS, row.status)
                }}</el-tag></template
              >
            </el-table-column>
          </el-table>
          <el-empty v-if="!recentOutbound.length" description="暂无出库单" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import {
  Refresh,
  User,
  OfficeBuilding,
  Box,
  Bell,
  Download,
  Upload,
  Coordinate,
  DocumentChecked
} from '@element-plus/icons-vue'
import { dashboardApi } from '@/api'
import { INBOUND_STATUS, OUTBOUND_STATUS, dictLabel, dictType } from '@/constants/dict'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent])

const router = useRouter()
const loading = ref(false)
const go = (path) => router.push(path)

// 后端按状态聚合的计数：{ status: count }
const inbound = ref({})
const outbound = ref({})
const check = ref({})
const recentInbound = ref([])
const recentOutbound = ref([])
const stats = reactive({ owner: 0, warehouse: 0, inventory: 0, todo: 0 })

const cnt = (counts, s) => counts.value[s] || 0
const todo = computed(() => ({
  inbound: cnt(inbound, 'AUDITED'),
  outbound: cnt(outbound, 'ALLOCATED'),
  allocate: cnt(outbound, 'AUDITED'),
  check: cnt(check, 'COUNTED')
}))

const chartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { bottom: 0, data: ['入库单', '出库单', '盘点单'] },
  grid: { top: 20, left: 40, right: 20, bottom: 40 },
  xAxis: { type: 'category', data: ['草稿', '已审核', '进行中', '已完成'] },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name: '入库单',
      type: 'bar',
      barMaxWidth: 26,
      itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] },
      data: [
        cnt(inbound, 'DRAFT'),
        cnt(inbound, 'AUDITED'),
        cnt(inbound, 'RECEIVING') + cnt(inbound, 'PUTAWAY'),
        cnt(inbound, 'FINISHED')
      ]
    },
    {
      name: '出库单',
      type: 'bar',
      barMaxWidth: 26,
      itemStyle: { color: '#34a853', borderRadius: [4, 4, 0, 0] },
      data: [
        cnt(outbound, 'DRAFT'),
        cnt(outbound, 'AUDITED'),
        cnt(outbound, 'ALLOCATED') + cnt(outbound, 'PICKING') + cnt(outbound, 'CHECKING'),
        cnt(outbound, 'SHIPPED')
      ]
    },
    {
      name: '盘点单',
      type: 'bar',
      barMaxWidth: 26,
      itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] },
      data: [
        cnt(check, 'DRAFT'),
        cnt(check, 'CHECKING'),
        cnt(check, 'COUNTED'),
        cnt(check, 'ADJUSTED') + cnt(check, 'FINISHED')
      ]
    }
  ]
}))

const loadData = async () => {
  loading.value = true
  try {
    // 一次聚合查询替代原先拉取 6 个全量列表；无模块权限的项由后端返回 0 / 空
    const data = await dashboardApi.stats()
    inbound.value = data?.inboundStatusCounts || {}
    outbound.value = data?.outboundStatusCounts || {}
    check.value = data?.checkStatusCounts || {}
    recentInbound.value = data?.recentInbound || []
    recentOutbound.value = data?.recentOutbound || []
    stats.owner = data?.ownerCount || 0
    stats.warehouse = data?.warehouseCount || 0
    stats.inventory = data?.inventoryCount || 0
    stats.todo = todo.value.inbound + todo.value.outbound + todo.value.allocate + todo.value.check
  } catch (e) {
    // 错误提示已由请求拦截器处理
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.stat-card {
  cursor: pointer;
}
.stat-content {
  flex-direction: row !important;
  align-items: center;
  gap: 16px;
}
.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}
.stat-text {
  display: flex;
  flex-direction: column;
}
.stat-content .stat-value {
  font-size: 28px;
}
.panel-card {
  border: none;
  border-radius: 12px;
  box-shadow: var(--brand-card-shadow);
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: var(--brand-secondary);
}
.chart {
  height: 320px;
}
.todo-list {
  display: flex;
  flex-direction: column;
}
.todo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 8px;
  border-bottom: 1px solid #f0f2f5;
  cursor: pointer;
  transition: background 0.2s ease;
}
.todo-item:last-child {
  border-bottom: none;
}
.todo-item:hover {
  background: #f7fafd;
}
.todo-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--brand-text);
}
.todo-left .el-icon {
  font-size: 18px;
}
</style>
