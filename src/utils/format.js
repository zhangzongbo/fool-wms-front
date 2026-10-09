const isEmpty = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

/** 空值统一显示 "-"（null / undefined / 空串） */
export const dash = (v) => (isEmpty(v) ? '-' : v)

/** el-table-column 的 :formatter，用法：<el-table-column prop="remark" :formatter="tableDash" /> */
export const tableDash = (row, column, cellValue) => dash(cellValue)

/**
 * 数量千分位，保留原有小数位；空值为 "-"，非数字原样返回
 * 列上配合 class-name="num" 使用等宽数字并右对齐
 */
export const formatQty = (v) => {
  if (isEmpty(v)) return '-'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  const decimals = String(v).includes('.') ? String(v).split('.')[1].length : 0
  return n.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** 数量列的 :formatter */
export const tableQty = (row, column, cellValue) => formatQty(cellValue)

/** 分页表格的全局序号：翻页后连续，用法 <el-table-column type="index" :index="rowIndex(page)" /> */
export const rowIndex = (page) => (i) => (page.current - 1) * page.size + i + 1
