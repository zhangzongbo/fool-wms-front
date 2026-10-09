import { describe, it, expect } from 'vitest'
import { splitRowActions } from './rowActions'

const act = (label, extra = {}) => ({ label, onClick: () => {}, ...extra })
const labels = (list) => list.map((a) => a.label)
const all = () => true

describe('splitRowActions', () => {
  it('不超过 max 时全部直接显示', () => {
    const r = splitRowActions([act('明细'), act('完成入库'), act('取消', { danger: true })], 3, all)
    expect(labels(r.visible)).toEqual(['明细', '完成入库', '取消'])
    expect(r.more).toEqual([])
  })

  it('超出时直接显示 max - 1 个，危险操作优先进入更多', () => {
    const r = splitRowActions(
      [act('明细'), act('审核'), act('编辑'), act('取消', { danger: true }), act('删除', { danger: true })],
      3,
      all
    )
    expect(labels(r.visible)).toEqual(['明细', '审核'])
    expect(labels(r.more)).toEqual(['编辑', '取消', '删除'])
  })

  it('非危险操作不足时用危险操作补足，且保持原顺序', () => {
    const r = splitRowActions(
      [act('删除', { danger: true }), act('编辑'), act('取消', { danger: true }), act('重置', { danger: true })],
      3,
      all
    )
    expect(labels(r.visible)).toEqual(['删除', '编辑'])
    expect(labels(r.more)).toEqual(['取消', '重置'])
  })

  it('过滤 show 为 false 与无权限项后再计算', () => {
    const has = (p) => p !== 'no'
    const r = splitRowActions(
      [
        act('明细'),
        act('审核', { show: false }),
        act('编辑', { perm: 'no' }),
        act('删除', { danger: true, perm: 'ok' })
      ],
      3,
      has
    )
    expect(labels(r.visible)).toEqual(['明细', '删除'])
    expect(r.more).toEqual([])
  })

  it('全部被过滤时不显示任何按钮', () => {
    const r = splitRowActions([act('删除', { perm: 'no' })], 3, () => false)
    expect(r).toEqual({ visible: [], more: [] })
  })
})
