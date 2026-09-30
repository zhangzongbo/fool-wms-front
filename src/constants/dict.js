// 业务字典与状态映射（与后端枚举保持一致）

// 通用启用/禁用（TINYINT: 1 启用 / 0 禁用）
export const ENABLE_STATUS = [
  { value: 1, label: '启用', type: 'success' },
  { value: 0, label: '禁用', type: 'info' }
]

// 入库单状态机：DRAFT→AUDITED→RECEIVING→PUTAWAY→FINISHED，可 CANCELLED
export const INBOUND_STATUS = {
  DRAFT: { label: '草稿', type: 'info' },
  AUDITED: { label: '已审核', type: 'primary' },
  RECEIVING: { label: '收货中', type: 'warning' },
  PUTAWAY: { label: '上架中', type: 'warning' },
  FINISHED: { label: '已完成', type: 'success' },
  CANCELLED: { label: '已取消', type: 'danger' }
}

// 出库单状态机：DRAFT→AUDITED→ALLOCATED→PICKING→CHECKING→SHIPPED，可 CANCELLED
export const OUTBOUND_STATUS = {
  DRAFT: { label: '草稿', type: 'info' },
  AUDITED: { label: '已审核', type: 'primary' },
  ALLOCATED: { label: '已分配', type: 'warning' },
  PICKING: { label: '拣货中', type: 'warning' },
  CHECKING: { label: '复核中', type: 'warning' },
  SHIPPED: { label: '已发货', type: 'success' },
  CANCELLED: { label: '已取消', type: 'danger' }
}

// 盘点单状态机：DRAFT→CHECKING→COUNTED→ADJUSTED→FINISHED，可 CANCELLED
export const CHECK_STATUS = {
  DRAFT: { label: '草稿', type: 'info' },
  CHECKING: { label: '盘点中', type: 'warning' },
  COUNTED: { label: '已盘点', type: 'primary' },
  ADJUSTED: { label: '已调整', type: 'success' },
  FINISHED: { label: '已完成', type: 'success' },
  CANCELLED: { label: '已取消', type: 'danger' }
}

// 货主状态（VARCHAR，商用约定）
export const OWNER_STATUS = {
  ENABLED: { label: '合作中', type: 'success' },
  DISABLED: { label: '已停用', type: 'info' }
}

// 货主等级
export const OWNER_LEVEL = {
  VIP: { label: 'VIP', type: 'danger' },
  NORMAL: { label: '普通', type: 'primary' },
  TRIAL: { label: '试用', type: 'warning' }
}

// 数据范围
export const DATA_SCOPE = {
  ALL: { label: '全部数据', type: 'danger' },
  CUSTOM: { label: '指定货主', type: 'primary' }
}

// 入库类型
export const INBOUND_TYPE = [
  { value: 'PURCHASE', label: '采购入库' },
  { value: 'RETURN', label: '退货入库' },
  { value: 'TRANSFER', label: '调拨入库' },
  { value: 'OTHER', label: '其他入库' }
]

// 出库类型
export const OUTBOUND_TYPE = [
  { value: 'SALE', label: '销售出库' },
  { value: 'RETURN', label: '退货出库' },
  { value: 'TRANSFER', label: '调拨出库' },
  { value: 'OTHER', label: '其他出库' }
]

// 盘点类型
export const CHECK_TYPE = [
  { value: 'FULL', label: '全盘' },
  { value: 'SPOT', label: '抽盘' },
  { value: 'DYNAMIC', label: '动态盘点' }
]

// 库区类型
export const AREA_TYPE = [
  { value: 'STORAGE', label: '存储区' },
  { value: 'PICKING', label: '拣货区' },
  { value: 'RECEIVING', label: '收货区' },
  { value: 'SHIPPING', label: '发货区' },
  { value: 'DEFECTIVE', label: '不良品区' }
]

// 库位类型
export const LOCATION_TYPE = [
  { value: 'SHELF', label: '货架位' },
  { value: 'FLOOR', label: '地堆位' },
  { value: 'PALLET', label: '托盘位' },
  { value: 'TEMP', label: '暂存位' }
]

// 物料类型
export const MATERIAL_TYPE = [
  { value: 'RAW', label: '原材料' },
  { value: 'SEMI', label: '半成品' },
  { value: 'FINISHED', label: '成品' },
  { value: 'PACKAGING', label: '包材' },
  { value: 'CONSUMABLE', label: '耗材' }
]

// 权限类型
export const PERM_TYPE = {
  MENU: { label: '菜单', type: 'primary' },
  BUTTON: { label: '按钮', type: 'info' },
  API: { label: '接口', type: 'warning' }
}

// 工具：从 map 中取 label
export function dictLabel(map, key, fallback = '-') {
  if (key === null || key === undefined || key === '') return fallback
  return map[key]?.label ?? key
}

// 工具：从 map 中取 tag type
export function dictType(map, key) {
  return map[key]?.type ?? 'info'
}

// 工具：从数组字典中取 label
export function optionLabel(list, value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  return list.find((i) => i.value === value)?.label ?? value
}

// 工具：从数组字典中取 tag type
export function optionType(list, value) {
  return list.find((i) => i.value === value)?.type ?? 'info'
}
