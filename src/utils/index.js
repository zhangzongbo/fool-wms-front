const pad = (n) => String(n).padStart(2, '0')

/**
 * 时间格式化为 YYYY-MM-DD HH:mm，空值返回 '-'
 * 后端 "yyyy-MM-dd HH:mm:ss" 字符串直接截取（已是东八区，避免被浏览器按 UTC 解析偏移）；其余按 Date 解析为本地时间
 * @param {string|number|Date} value
 */
export const formatDateTime = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) return value.slice(0, 16)
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
