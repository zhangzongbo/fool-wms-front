<template>
  <el-timeline class="status-timeline">
    <el-timeline-item
      v-for="(log, i) in items"
      :key="i"
      :timestamp="formatDateTime(log.createTime)"
      :type="i === items.length - 1 ? 'primary' : ''"
      placement="top"
    >
      <div class="log-title">
        {{ actionLabel(log) }}
        <el-tag v-if="log.toStatus" size="small" :type="dictType(statusDict, log.toStatus)">{{
          dictLabel(statusDict, log.toStatus)
        }}</el-tag>
      </div>
      <div class="log-meta">{{ dash(log.createByName) }}</div>
    </el-timeline-item>
    <el-timeline-item v-if="!logs.length" placement="top" type="info">
      <div class="log-meta">上线前创建的单据没有状态日志，更早的操作记录不可追溯</div>
    </el-timeline-item>
  </el-timeline>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTime } from '@/utils'
import { dash } from '@/utils/format'
import { dictLabel, dictType } from '@/constants/dict'

/**
 * 单据状态时间线：后端 t_doc_status_log 按时间正序
 * 历史单据没有日志时，用单头的创建时间 / 创建人显示一条「创建」
 */
const props = defineProps({
  logs: { type: Array, default: () => [] },
  statusDict: { type: Object, required: true },
  order: { type: Object, default: null } // 单头：createTime、createByName，用于无日志时的兜底
})

const ACTION_LABELS = {
  CREATE: '创建',
  SAVE: '保存修改',
  AUDIT: '审核',
  COMPLETE: '完成入库',
  ALLOCATE: '分配库存',
  SHIP: '发货',
  CANCEL: '取消',
  START_COUNT: '开始盘点',
  FINISH_COUNT: '完成盘点',
  POST: '过账',
  COUNT: '录入实盘'
}
const actionLabel = (log) => ACTION_LABELS[log.action] || dictLabel(props.statusDict, log.toStatus, log.action)

const items = computed(() =>
  props.logs.length
    ? props.logs
    : [{ action: 'CREATE', createTime: props.order?.createTime, createByName: props.order?.createByName }]
)
</script>

<style scoped>
.log-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--brand-secondary);
}
.log-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--brand-text-secondary);
}
</style>
