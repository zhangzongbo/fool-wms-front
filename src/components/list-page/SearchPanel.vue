<template>
  <el-card class="search-card">
    <el-form :model="model" label-position="top" class="search-form" @submit.prevent="$emit('search')">
      <el-row :gutter="16">
        <slot />
        <el-col :span="actionSpan" class="search-actions">
          <el-form-item label=" ">
            <el-button v-if="showSearch" type="primary" native-type="submit" :icon="Search">查询</el-button>
            <el-button :icon="Refresh" @click="$emit('reset')">重置</el-button>
            <slot name="extra" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<script setup>
import { Search, Refresh } from '@element-plus/icons-vue'

/**
 * 筛选区：默认插槽放 <el-col><el-form-item>…</el-form-item></el-col> 形式的筛选字段，按钮固定在行尾
 * - 列表均为服务端分页（useServerList）：关键字由「查询」或回车触发 search；下拉在字段上 @change 立即查询
 * - :show-search="false" 只保留「重置」，用于没有关键字输入的筛选区
 */
defineProps({
  model: { type: Object, required: true },
  showSearch: { type: Boolean, default: true },
  actionSpan: { type: Number, default: 6 }
})
defineEmits(['search', 'reset'])
</script>
