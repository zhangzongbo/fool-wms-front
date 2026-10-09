<template>
  <el-popover trigger="click" placement="bottom-end" :width="200">
    <template #reference>
      <el-button :icon="Setting">列设置</el-button>
    </template>
    <div class="column-settings">
      <div class="column-settings__head">
        <span>显示列</span>
        <el-link type="primary" underline="never" @click="cols.reset()">恢复默认</el-link>
      </div>
      <div class="column-settings__list">
        <el-checkbox
          v-for="item in items"
          :key="item.key"
          :model-value="item.visible"
          :disabled="item.fixed"
          :title="item.fixed ? '固定列，不可隐藏' : ''"
          @change="cols.toggle(item.key)"
          >{{ item.label }}</el-checkbox
        >
      </div>
      <div class="column-settings__tip">拖动表头边线可调整列宽，设置保存在本浏览器</div>
    </div>
  </el-popover>
</template>

<script setup>
import { computed, unref } from 'vue'
import { Setting } from '@element-plus/icons-vue'

/**
 * 列设置按钮 + 弹出面板（放在 TableToolbar #settings 插槽）
 * cols 为 useTableColumns() 的返回值：勾选切换显示，固定列置灰不可取消，「恢复默认」清空隐藏与列宽
 */
const props = defineProps({
  cols: { type: Object, required: true }
})
const items = computed(() => unref(props.cols.settings) || [])
</script>

<style scoped>
.column-settings__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: 600;
}
.column-settings__list {
  display: flex;
  flex-direction: column;
  max-height: 320px;
  overflow-y: auto;
}
.column-settings__list .el-checkbox {
  height: 28px;
  margin-right: 0;
}
.column-settings__tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
