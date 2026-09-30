import { describe, it, expect } from 'vitest'
import { settledValue } from './index'

describe('settledValue', () => {
  it('成功时返回数据，空值兜底为 []', () => {
    expect(settledValue({ status: 'fulfilled', value: [1, 2] }, ['old'])).toEqual([1, 2])
    expect(settledValue({ status: 'fulfilled', value: null }, ['old'])).toEqual([])
  })

  it('失败时返回 fallback（保留旧数据）', () => {
    expect(settledValue({ status: 'rejected', reason: new Error('x') }, ['old'])).toEqual(['old'])
  })
})
