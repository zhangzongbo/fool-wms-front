import { useUserStore } from '@/stores/user'

/**
 * 按钮级权限：v-perm="'sys:owner:add'"，无权限时隐藏元素
 * 仅做界面收敛，真正的鉴权由后端 @SaCheckPermission 保证
 * 用 display 隐藏而非移除节点，避免破坏 Vue 对 DOM 的管理
 */
const apply = (el, { value }) => {
  el.style.display = useUserStore().hasPermission(value) ? '' : 'none'
}

export default {
  mounted: apply,
  updated: apply
}
