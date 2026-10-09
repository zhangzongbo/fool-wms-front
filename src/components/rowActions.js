/**
 * 行操作拆分：直接显示的按钮 + 收进「更多」的按钮
 * - 先过滤 show === false 与无权限项
 * - 可见数量 ≤ max 时全部直接显示；否则直接显示 max - 1 个，加「更多」共 max 个
 * - 溢出时危险操作（删除 / 取消 / 重置密码等，danger: true）优先进入「更多」；其余按传入顺序（即优先级）保留
 * @param {Array<{label:string,onClick:Function,perm?:string,show?:boolean,type?:string,danger?:boolean}>} actions
 * @param {number} max 一行最多直接可见的数量（含「更多」）
 * @param {(perm?:string)=>boolean} hasPermission
 * @returns {{ visible: Array, more: Array }} more 为空时不显示「更多」
 */
export function splitRowActions(actions, max, hasPermission) {
  const available = actions.filter((a) => a.show !== false && hasPermission(a.perm))
  if (available.length <= max) {
    return { visible: available, more: [] }
  }
  const keep = new Set([...available.filter((a) => !a.danger), ...available.filter((a) => a.danger)].slice(0, max - 1))
  return {
    visible: available.filter((a) => keep.has(a)),
    more: available.filter((a) => !keep.has(a))
  }
}
