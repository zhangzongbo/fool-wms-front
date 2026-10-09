<template>
  <el-tabs :model-value="modelValue || ALL" class="status-tabs" @tab-change="onChange">
    <el-tab-pane :name="ALL">
      <template #label
        >全部<span class="status-count">{{ allCount }}</span></template
      >
    </el-tab-pane>
    <el-tab-pane v-for="(item, key) in options" :key="key" :name="key">
      <template #label
        ><span :class="{ 'is-zero': !counts[key] }"
          >{{ item.label }}<span class="status-count">{{ counts[key] || 0 }}</span></span
        ></template
      >
    </el-tab-pane>
  </el-tabs>
</template>

<script setup>
import { computed } from 'vue'

/**
 * 单据状态页签：「全部」+ 字典中的每个状态，显示数量（数量为 0 时置灰但不隐藏，位置不跳动）
 * counts 由后端按当前其他筛选条件（不含状态）统计，所以页签数量与点开后的列表条数一致
 * v-model 为状态值，「全部」对应 ''
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Object, required: true }, // 字典，如 INBOUND_STATUS
  counts: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue', 'change'])

const ALL = '__ALL__'
const allCount = computed(() => Object.values(props.counts || {}).reduce((sum, n) => sum + (Number(n) || 0), 0))

const onChange = (name) => {
  const value = name === ALL ? '' : name
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.status-tabs :deep(.el-tabs__header) {
  margin: 0;
}
.status-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}
.status-count {
  margin-left: 6px;
  font-variant-numeric: tabular-nums;
  color: var(--brand-text-secondary);
}
.is-zero {
  color: var(--el-text-color-placeholder);
}
</style>
