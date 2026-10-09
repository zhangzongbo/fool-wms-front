<template>
  <el-pagination
    background
    layout="total, sizes, prev, pager, next, jumper"
    :total="total"
    :current-page="current"
    :page-size="size"
    :page-sizes="PAGE_SIZES"
    @current-change="onCurrentChange"
    @size-change="onSizeChange"
  />
</template>

<script setup>
/**
 * 统一分页：v-model:current / v-model:size + total
 * - 前端分页（useLocalPage）：绑定 page.current / page.size 即可
 * - 服务端分页：额外监听 change 重新请求（v-model 已先行更新）
 * 改每页条数时回到第 1 页
 */
defineProps({
  total: { type: Number, required: true },
  current: { type: Number, required: true },
  size: { type: Number, required: true }
})
const emit = defineEmits(['update:current', 'update:size', 'change'])

const PAGE_SIZES = [10, 20, 50, 100]

const onCurrentChange = (v) => {
  emit('update:current', v)
  emit('change')
}
const onSizeChange = (v) => {
  emit('update:size', v)
  emit('update:current', 1)
  emit('change')
}
</script>
