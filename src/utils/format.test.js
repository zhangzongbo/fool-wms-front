import { describe, it, expect } from 'vitest'
import { dash, tableDash, formatQty, tableQty, rowIndex } from './format'

describe('format', () => {
  it('dash：空值显示 -，0 和 false 原样保留', () => {
    expect(dash(null)).toBe('-')
    expect(dash(undefined)).toBe('-')
    expect(dash('  ')).toBe('-')
    expect(dash(0)).toBe(0)
    expect(dash('备注')).toBe('备注')
    expect(tableDash({}, {}, '')).toBe('-')
  })

  it('formatQty：千分位并保留原有小数位', () => {
    expect(formatQty(1234567)).toBe('1,234,567')
    expect(formatQty('1234.50')).toBe('1,234.50')
    expect(formatQty(0)).toBe('0')
    expect(formatQty(-1200)).toBe('-1,200')
    expect(formatQty(null)).toBe('-')
    expect(formatQty('abc')).toBe('abc')
    expect(tableQty({}, {}, 1000)).toBe('1,000')
  })

  it('rowIndex：翻页后序号连续', () => {
    expect(rowIndex({ current: 3, size: 20 })(0)).toBe(41)
  })
})
