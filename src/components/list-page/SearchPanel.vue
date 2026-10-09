<template>
  <el-card class="search-card">
    <el-form :model="model" label-position="top" class="search-form" @submit.prevent="$emit('search')">
      <el-row :gutter="16">
        <slot />
        <!-- 按钮列响应式：≥992（md 及以上）沿用 actionSpan，桌面布局不变；更窄时整行 / 半行，避免按钮被挤出 -->
        <el-col :span="actionSpan" :xs="24" :sm="12" :md="actionSpan" :lg="actionSpan" class="search-actions">
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
 * - actionSpan：按钮列在 md（≥992）及以上的栅格宽度，一般取「24 − 同一行字段 span 之和」；
 *   字段列建议同样写 :xs/:sm/:md/:lg 响应式栅格，窄屏下每行字段数减少
 */
defineProps({
  model: { type: Object, required: true },
  showSearch: { type: Boolean, default: true },
  actionSpan: { type: Number, default: 6 }
})
defineEmits(['search', 'reset'])
</script>
