import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api', () => ({
  ownerApi: { all: vi.fn() },
  warehouseApi: { getAllWarehouses: vi.fn() },
  warehouseAreaApi: { all: vi.fn() },
  locationApi: { all: vi.fn() },
  materialApi: { getAllMaterials: vi.fn() }
}))
import { ownerApi, warehouseApi, locationApi } from '@/api'
import { useRefDataStore } from './refData'

describe('useRefDataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ownerApi.all.mockResolvedValue([{ id: 1, ownerName: '货主A' }])
    warehouseApi.getAllWarehouses.mockResolvedValue([{ id: 2, warehouseName: '仓库B' }])
  })

  it('同一数据只拉取一次，并提供名称查询', async () => {
    const store = useRefDataStore()
    await store.ensure(['owners', 'warehouses'])
    await store.ensure(['owners'])
    expect(ownerApi.all).toHaveBeenCalledOnce()
    expect(store.ownerName(1)).toBe('货主A')
    expect(store.warehouseName(2)).toBe('仓库B')
    expect(store.ownerName(99)).toBe('-')
  })

  it('库位显示编码：空值为 -，缓存中不存在时显示 #id', async () => {
    locationApi.all.mockResolvedValue([{ id: 7, locationCode: 'A-01-01' }])
    const store = useRefDataStore()
    await store.ensure(['locations'])
    expect(store.locationCode(7)).toBe('A-01-01')
    expect(store.locationCode(8)).toBe('#8')
    expect(store.locationCode(null)).toBe('-')
  })

  it('force 强制重拉，invalidate 后下次重拉', async () => {
    const store = useRefDataStore()
    await store.ensure(['owners'])
    await store.ensure(['owners'], { force: true })
    store.invalidate('owners')
    await store.ensure(['owners'])
    expect(ownerApi.all).toHaveBeenCalledTimes(3)
  })

  it('加载失败不影响其他项，且下次会重试', async () => {
    ownerApi.all.mockRejectedValueOnce(new Error('500'))
    const store = useRefDataStore()
    const results = await store.ensure(['owners', 'warehouses'])
    expect(results.map((r) => r.status)).toEqual(['rejected', 'fulfilled'])
    expect(store.warehouses).toHaveLength(1)
    await store.ensure(['owners'])
    expect(store.owners).toHaveLength(1)
  })

  it('reset 清空数据并在下次重拉（换账号场景）', async () => {
    const store = useRefDataStore()
    await store.ensure(['owners'])
    store.reset()
    expect(store.owners).toEqual([])
    await store.ensure(['owners'])
    expect(ownerApi.all).toHaveBeenCalledTimes(2)
  })
})
