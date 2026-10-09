<template>
  <div class="page-header">
    <div class="header-title">
      <h2>{{ title || route.meta?.title }}</h2>
      <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="header-actions"><slot name="actions" /></div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'

/** 页头：标题默认取路由 meta.title（顶栏只有面包屑，标题仅在此出现一次）；actions 插槽放「新增」等主操作 */
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' }
})

const route = useRoute()
</script>
