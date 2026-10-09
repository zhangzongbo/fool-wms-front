import { describe, it, expect, vi, beforeEach } from 'vitest'

const route = { query: {} }
const router = { replace: vi.fn() }
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => router }))

import { useServerList } from './useServerList'

const pageOf = (records, total, extra = {}) =>
  Promise.resolve({ current: 1, size: 10, total, pages: 1, records, ...extra })
const DEFAULTS = { keyword: '', warehouseId: null, status: '' }

describe('useServerList', () => {
  beforeEach(() => {
    route.query = {}
    router.replace.mockClear()
  })

  it('请求只带非空筛选，PageResult 以外的字段放入 extra', async () => {
    const fetch = vi.fn(() => pageOf([{ id: 1 }], 25, { statusCounts: { DRAFT: 3 } }))
    const l = useServerList(fetch, DEFAULTS)
    l.query.keyword = ' IN01 '
    l.query.status = undefined // Element Plus 清空 select 后为 undefined
    l.query.warehouseId = null
    await l.search()
    expect(fetch).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10, keyword: 'IN01' })
    expect(l.list.value).toEqual([{ id: 1 }])
    expect(l.total.value).toBe(25)
    expect(l.extra.value).toEqual({ statusCounts: { DRAFT: 3 } })
  })

  it('纯空白视为空值', async () => {
    const fetch = vi.fn(() => pageOf([], 0))
    const l = useServerList(fetch, DEFAULTS)
    l.query.keyword = '   '
    await l.search()
    expect(fetch).toHaveBeenCalledWith({ pageNum: 1, pageSize: 10 })
  })

  it('查询条件与页码写入 URL，默认值不写入', async () => {
    const l = useServerList(() => pageOf([{ id: 1 }], 30), DEFAULTS)
    l.query.warehouseId = 5
    l.page.current = 2
    await l.reload()
    expect(router.replace).toHaveBeenLastCalledWith({ query: { warehouseId: '5', pageNum: '2' } })
  })

  it('从 URL 恢复，并按默认值类型还原数字', async () => {
    route.query = { warehouseId: '5', status: 'DRAFT', pageNum: '3', pageSize: '20' }
    const fetch = vi.fn(() => pageOf([{ id: 1 }], 100))
    const l = useServerList(fetch, DEFAULTS)
    expect(l.query).toEqual({ keyword: '', warehouseId: 5, status: 'DRAFT' })
    await l.reload()
    expect(fetch).toHaveBeenCalledWith({ pageNum: 3, pageSize: 20, warehouseId: 5, status: 'DRAFT' })
  })

  it('setFilter 立即查询并回到第 1 页；reset 恢复默认值', async () => {
    const fetch = vi.fn(() => pageOf([], 0))
    const l = useServerList(fetch, DEFAULTS)
    l.page.current = 4
    await l.setFilter('status', 'AUDITED')
    expect(fetch).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10, status: 'AUDITED' })
    l.query.keyword = 'x'
    await l.reset()
    expect(l.query).toEqual(DEFAULTS)
    expect(fetch).toHaveBeenLastCalledWith({ pageNum: 1, pageSize: 10 })
  })

  it('当前页被删空时退回最后一页', async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => pageOf([], 20))
      .mockImplementationOnce(() => pageOf([{ id: 20 }], 20))
    const l = useServerList(fetch, DEFAULTS)
    l.page.current = 3
    await l.reload()
    expect(l.page.current).toBe(2)
    expect(fetch).toHaveBeenLastCalledWith({ pageNum: 2, pageSize: 10 })
    expect(l.list.value).toEqual([{ id: 20 }])
  })

  it('丢弃过期响应', async () => {
    let resolveFirst
    const fetch = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockImplementationOnce(() => pageOf([{ id: 'new' }], 1))
    const l = useServerList(fetch, DEFAULTS)
    const first = l.reload()
    await l.reload()
    resolveFirst({ records: [{ id: 'old' }], total: 1 })
    await first
    expect(l.list.value).toEqual([{ id: 'new' }])
    expect(l.loading.value).toBe(false)
  })

  it('syncQuery 为 false 时不读写 URL', async () => {
    route.query = { status: 'DRAFT' }
    const l = useServerList(() => pageOf([], 0), DEFAULTS, { syncQuery: false })
    expect(l.query.status).toBe('')
    await l.reload()
    expect(router.replace).not.toHaveBeenCalled()
  })
})
