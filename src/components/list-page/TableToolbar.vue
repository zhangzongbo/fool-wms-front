<template>
  <div class="table-toolbar">
    <div class="toolbar-left"><slot name="left" /></div>
    <div class="toolbar-actions">
      <slot name="actions" />
      <slot name="settings" />
      <el-button :icon="Refresh" :loading="loading" @click="$emit('refresh')">刷新</el-button>
    </div>
  </div>
</template>

<script setup>
import { Refresh } from '@element-plus/icons-vue'

/**
 * 表格工具栏：放在表格卡片顶部，右侧固定「刷新」
 * - left / actions 插槽放表格级操作（如展开 / 收起、导出）
 * - settings 插槽紧挨「刷新」之前，放 <ColumnSettings :cols="cols" />（列设置，useTableColumns）
 */
defineProps({
  loading: { type: Boolean, default: false }
})
defineEmits(['refresh'])
</script>
