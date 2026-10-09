<template>
  <div class="row-actions">
    <el-button
      v-for="a in split.visible"
      :key="a.label"
      link
      :type="a.type || (a.danger ? 'danger' : 'primary')"
      @click="a.onClick()"
      >{{ a.label }}</el-button
    >
    <el-dropdown v-if="split.more.length" trigger="click" @command="(i) => split.more[i].onClick()">
      <el-button link type="primary"
        >更多<el-icon class="el-icon--right"><ArrowDown /></el-icon
      ></el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="(a, i) in split.more"
            :key="a.label"
            :command="i"
            :class="{ 'row-action-danger': a.danger }"
            >{{ a.label }}</el-dropdown-item
          >
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { splitRowActions } from './rowActions'

/**
 * 表格行操作：一行最多直接显示 max 个（含「更多」），规则见 splitRowActions
 * 权限用 perm 字段声明（与 v-perm 同一判断），不要再在按钮上写 v-perm
 */
const props = defineProps({
  actions: { type: Array, required: true },
  max: { type: Number, default: 3 }
})

const userStore = useUserStore()
const split = computed(() => splitRowActions(props.actions, props.max, userStore.hasPermission))
</script>

<style scoped>
.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.row-actions .el-button + .el-button {
  margin-left: 0;
}
</style>
