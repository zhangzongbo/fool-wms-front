import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const PAGE_KEYS = ['current', 'size', 'total', 'pages', 'records']
const isEmpty = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

/** 去掉空值并 trim：空筛选（含纯空白）既不传给接口，也不写入 URL（Element Plus 清空 select 后值为 undefined） */
const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => !isEmpty(v))
      .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
  )

/** URL 中的字符串按默认值类型还原：数字默认值或纯数字的 null 默认值（如 warehouseId）还原为数字 */
const parseValue = (raw, defaultValue) => {
  const v = Array.isArray(raw) ? raw[0] : raw
  if (isEmpty(v)) return defaultValue
  if (typeof defaultValue === 'number' || (defaultValue === null && /^-?\d+$/.test(v))) {
    const n = Number(v)
    return Number.isNaN(n) ? defaultValue : n
  }
  if (typeof defaultValue === 'boolean') return v === 'true'
  return v
}

/**
 * 服务端分页列表：查询条件 + 分页 + 请求，并与 URL query 同步（刷新、分享链接、前进后退后保持）
 * - 请求参数为 { pageNum, pageSize, ...非空筛选 }，对应后端 POST /{资源}/list（BasePageRequest）
 * - 响应中 PageResult 以外的字段（如单据的 statusCounts、库存的 summary）放入 extra
 * - 下拉 / 状态页签用 setFilter 立即查询；关键字由「查询」按钮或回车触发 search
 * - 删除等操作后当前页变空时自动退回最后一页
 * @param {(params: object) => Promise<{records: Array, total: number}>} fetch
 * @param {object} defaults 筛选默认值，同时决定 URL 恢复时的类型，如 { keyword: '', warehouseId: null, status: '' }
 * @param {{ syncQuery?: boolean, pageSize?: number }} [options]
 */
export function useServerList(fetch, defaults = {}, { syncQuery = true, pageSize = 10 } = {}) {
  const route = syncQuery ? useRoute() : null
  const router = syncQuery ? useRouter() : null

  const query = reactive({ ...defaults })
  const page = reactive({ current: 1, size: pageSize })
  const list = ref([])
  const total = ref(0)
  const extra = ref({})
  const loading = ref(false)
  let seq = 0

  if (route) {
    Object.keys(defaults).forEach((key) => {
      query[key] = parseValue(route.query[key], defaults[key])
    })
    page.current = parseValue(route.query.pageNum, 1)
    page.size = parseValue(route.query.pageSize, pageSize)
  }

  const writeUrl = () => {
    const q = compact(query)
    if (page.current !== 1) q.pageNum = String(page.current)
    if (page.size !== pageSize) q.pageSize = String(page.size)
    router.replace({ query: Object.fromEntries(Object.entries(q).map(([k, v]) => [k, String(v)])) })
  }

  const reload = async () => {
    const id = ++seq
    loading.value = true
    if (router) writeUrl()
    try {
      const res = (await fetch({ pageNum: page.current, pageSize: page.size, ...compact(query) })) || {}
      if (id !== seq) return // 已有更新的请求，丢弃过期响应
      const records = res.records || []
      const count = Number(res.total) || 0
      if (!records.length && count > 0 && page.current > 1) {
        page.current = Math.max(1, Math.ceil(count / page.size))
        return reload()
      }
      list.value = records
      total.value = count
      extra.value = Object.fromEntries(Object.entries(res).filter(([k]) => !PAGE_KEYS.includes(k)))
    } catch (e) {
      // 错误提示已由请求拦截器处理，保留当前数据
    } finally {
      if (id === seq) loading.value = false
    }
  }

  const search = () => {
    page.current = 1
    return reload()
  }

  const reset = () => {
    Object.assign(query, defaults)
    return search()
  }

  const setFilter = (key, value) => {
    query[key] = value
    return search()
  }

  return { query, page, list, total, extra, loading, search, reset, reload, setFilter }
}
