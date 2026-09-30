import { describe, it, expect } from 'vitest'
import { settledValue, formatDateTime } from './index'

describe('settledValue', () => {
  it('成功时返回数据，空值兜底为 []', () => {
    expect(settledValue({ status: 'fulfilled', value: [1, 2] }, ['old'])).toEqual([1, 2])
    expect(settledValue({ status: 'fulfilled', value: null }, ['old'])).toEqual([])
  })

  it('失败时返回 fallback（保留旧数据）', () => {
    expect(settledValue({ status: 'rejected', reason: new Error('x') }, ['old'])).toEqual(['old'])
  })
})

describe('formatDateTime', () => {
  it('空值显示 -', () => {
    expect(formatDateTime(null)).toBe('-')
    expect(formatDateTime(undefined)).toBe('-')
    expect(formatDateTime('')).toBe('-')
  })

  it('后端 yyyy-MM-dd HH:mm:ss 字符串直接截到分钟，不做时区换算', () => {
    expect(formatDateTime('2026-09-29 12:29:53')).toBe('2026-09-29 12:29')
  })

  it('Date / 时间戳按本地时间格式化', () => {
    const d = new Date(2026, 0, 5, 8, 3, 9)
    expect(formatDateTime(d)).toBe('2026-01-05 08:03')
    expect(formatDateTime(d.getTime())).toBe('2026-01-05 08:03')
  })

  it('无法解析时原样返回', () => {
    expect(formatDateTime('abc')).toBe('abc')
  })
})
