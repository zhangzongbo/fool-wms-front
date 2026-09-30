import { describe, it, expect } from 'vitest'
import { ENABLE_STATUS, OWNER_STATUS, dictLabel, dictType, optionLabel, optionType } from './dict'

describe('字典工具', () => {
  it('dictLabel / dictType 按 key 取对象字典', () => {
    const [key, item] = Object.entries(OWNER_STATUS)[0]
    expect(dictLabel(OWNER_STATUS, key)).toBe(item.label)
    expect(dictLabel(OWNER_STATUS, '')).toBe('-')
    expect(dictLabel(OWNER_STATUS, 'UNKNOWN')).toBe('UNKNOWN')
    expect(dictType(OWNER_STATUS, 'UNKNOWN')).toBe('info')
  })

  it('optionLabel / optionType 按 value 取数组字典', () => {
    expect(optionLabel(ENABLE_STATUS, 1)).toBe('启用')
    expect(optionLabel(ENABLE_STATUS, 0)).toBe('禁用')
    expect(optionLabel(ENABLE_STATUS, null)).toBe('-')
    expect(optionLabel(ENABLE_STATUS, 9)).toBe(9)
    expect(optionType(ENABLE_STATUS, 1)).toBe('success')
    expect(optionType(ENABLE_STATUS, 0)).toBe('info')
    expect(optionType(ENABLE_STATUS, 9)).toBe('info')
  })
})
