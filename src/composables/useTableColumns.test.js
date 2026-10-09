import { describe, it, expect, vi, beforeEach } from 'vitest'

const user = { userInfo: { userId: 1 } }
vi.mock('@/stores/user', () => ({ useUserStore: () => user }))

import { useTableColumns, columnsStorageKey } from './useTableColumns'

const COLUMNS = [
  { key: 'code', label: '单号', fixed: true },
  { key: 'owner', label: '货主' },
  { key: 'remark', label: '备注' }
]
const drag = (cols, key, w) => cols.onDragEnd(w, 100, { columnKey: key })

describe('useTableColumns', () => {
  beforeEach(() => {
    localStorage.clear()
    user.userInfo = { userId: 1 }
  })

  it('默认全部显示、宽度取默认值', () => {
    const cols = useTableColumns('inbound', COLUMNS)
    expect(cols.visible('owner')).toBe(true)
    expect(cols.width('owner', 130)).toBe(130)
    expect(cols.width('remark')).toBeUndefined()
    expect(cols.settings.value).toEqual([
      { key: 'code', label: '单号', fixed: true, visible: true },
      { key: 'owner', label: '货主', fixed: false, visible: true },
      { key: 'remark', label: '备注', fixed: false, visible: true }
    ])
  })

  it('隐藏与列宽写入本地，重新创建后恢复', () => {
    const a = useTableColumns('inbound', COLUMNS)
    a.toggle('remark')
    drag(a, 'owner', 222.4)
    expect(a.visible('remark')).toBe(false)
    expect(a.width('owner', 130)).toBe(222)
    expect(JSON.parse(localStorage.getItem('wms:cols:1:inbound:v1'))).toEqual({
      hidden: ['remark'],
      widths: { owner: 222 }
    })

    const b = useTableColumns('inbound', COLUMNS)
    expect(b.visible('remark')).toBe(false)
    expect(b.width('owner', 130)).toBe(222)
    b.toggle('remark')
    expect(useTableColumns('inbound', COLUMNS).visible('remark')).toBe(true)
  })

  it('按用户与页面隔离；未登录记为 anon', () => {
    useTableColumns('inbound', COLUMNS).toggle('owner')
    expect(useTableColumns('outbound', COLUMNS).visible('owner')).toBe(true)

    user.userInfo = { userId: 2 }
    expect(useTableColumns('inbound', COLUMNS).visible('owner')).toBe(true)

    user.userInfo = null
    useTableColumns('inbound', COLUMNS).toggle('remark')
    expect(localStorage.getItem(columnsStorageKey(undefined, 'inbound', 1))).toContain('remark')
    expect(columnsStorageKey(undefined, 'inbound', 1)).toBe('wms:cols:anon:inbound:v1')
  })

  it('版本号变化后旧数据失效', () => {
    useTableColumns('inbound', COLUMNS).toggle('owner')
    expect(useTableColumns('inbound', COLUMNS, { version: 2 }).visible('owner')).toBe(true)
    expect(useTableColumns('inbound', COLUMNS, { version: 1 }).visible('owner')).toBe(false)
  })

  it('固定列不可隐藏（含存储中被篡改的情况），未知列与非法宽度被忽略', () => {
    const cols = useTableColumns('inbound', COLUMNS)
    cols.toggle('code')
    cols.toggle('unknown')
    expect(cols.visible('code')).toBe(true)
    expect(localStorage.getItem('wms:cols:1:inbound:v1')).toBeNull()

    localStorage.setItem(
      'wms:cols:1:inbound:v1',
      JSON.stringify({ hidden: ['code', 'gone', 'owner'], widths: { gone: 80, owner: -1, remark: 'x', code: 200 } })
    )
    const loaded = useTableColumns('inbound', COLUMNS)
    expect(loaded.visible('code')).toBe(true)
    expect(loaded.visible('owner')).toBe(false)
    expect(loaded.width('owner', 130)).toBe(130)
    expect(loaded.width('remark', 150)).toBe(150)
    expect(loaded.width('code', 170)).toBe(200) // 固定列宽度可记住
  })

  it('拖动只记录带已知 column-key 的列', () => {
    const cols = useTableColumns('inbound', COLUMNS)
    cols.onDragEnd(90, 60, { columnKey: undefined }) // 未配置的列（如序号）
    cols.onDragEnd(90, 60, { columnKey: 'other' })
    cols.onDragEnd(NaN, 60, { columnKey: 'owner' })
    expect(localStorage.getItem('wms:cols:1:inbound:v1')).toBeNull()
    drag(cols, 'code', 180)
    expect(cols.width('code', 170)).toBe(180)
  })

  it('恢复默认清空隐藏与列宽', () => {
    const cols = useTableColumns('inbound', COLUMNS)
    cols.toggle('owner')
    drag(cols, 'remark', 300)
    cols.reset()
    expect(cols.visible('owner')).toBe(true)
    expect(cols.width('remark', 150)).toBe(150)
    expect(localStorage.getItem('wms:cols:1:inbound:v1')).toBeNull()
  })

  it('存储损坏或不可用时不报错', () => {
    localStorage.setItem('wms:cols:1:inbound:v1', '{bad json')
    const cols = useTableColumns('inbound', COLUMNS)
    expect(cols.visible('owner')).toBe(true)
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => cols.toggle('owner')).not.toThrow()
    expect(cols.visible('owner')).toBe(false)
    spy.mockRestore()
  })
})
