import { describe, it, expect, vi } from 'vitest'
import { useOrderDetail } from './useOrderDetail'

const deferred = () => {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

describe('useOrderDetail', () => {
  it('打开抽屉并加载该单据的明细', async () => {
    const list = vi.fn(() => Promise.resolve([{ id: 1 }]))
    const { detail, detailList, openDetail } = useOrderDetail(list)
    openDetail({ id: 10 })
    expect(detail.visible).toBe(true)
    await vi.waitFor(() => expect(detailList.value).toEqual([{ id: 1 }]))
    expect(list).toHaveBeenCalledWith(10)
  })

  it('切换单据后丢弃过期响应', async () => {
    const first = deferred()
    const list = vi.fn((id) => (id === 10 ? first.promise : Promise.resolve([{ id: 'B' }])))
    const { detailList, openDetail } = useOrderDetail(list)
    openDetail({ id: 10 })
    openDetail({ id: 20 })
    await vi.waitFor(() => expect(detailList.value).toEqual([{ id: 'B' }]))
    first.resolve([{ id: 'A' }])
    await first.promise
    expect(detailList.value).toEqual([{ id: 'B' }])
  })

  it('syncDetail：抽屉打开时替换为最新单头并重新加载', async () => {
    const list = vi.fn(() => Promise.resolve([]))
    const { detail, openDetail, syncDetail } = useOrderDetail(list)
    openDetail({ id: 10, status: 'DRAFT' })
    syncDetail([{ id: 10, status: 'AUDITED' }])
    expect(detail.order.status).toBe('AUDITED')
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('syncDetail：抽屉关闭时不做任何事', () => {
    const list = vi.fn(() => Promise.resolve([]))
    const { detail, openDetail, syncDetail } = useOrderDetail(list)
    openDetail({ id: 10 })
    detail.visible = false
    syncDetail([{ id: 10, status: 'AUDITED' }])
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('加载失败时不抛出异常并复位 loading', async () => {
    const { detail, openDetail } = useOrderDetail(() => Promise.reject(new Error('500')))
    openDetail({ id: 10 })
    await vi.waitFor(() => expect(detail.loading).toBe(false))
  })
})
