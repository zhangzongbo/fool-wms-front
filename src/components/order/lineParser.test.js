import { describe, it, expect } from 'vitest'
import { parsePastedLines, normalizeDate } from './lineParser'

const materialsByCode = new Map([['M001', { id: 1, materialCode: 'M001', materialName: '苹果', unit: '箱' }]])
const locationsByCode = new Map([
  ['A-01', { id: 10, locationCode: 'A-01', warehouseId: 1 }],
  ['B-01', { id: 20, locationCode: 'B-01', warehouseId: 2 }]
])
const ctx = { kind: 'inbound', materialsByCode, locationsByCode, warehouseId: 1 }

describe('parsePastedLines', () => {
  it('解析 TSV 并跳过表头与空行，按编码回填物料与库位', () => {
    const text = '物料编码\t数量\t库位编码\t批次\t效期\nM001\t1,200\tA-01\tB1\t2026/12/31\n\n'
    const [line] = parsePastedLines(text, ctx)
    expect(line).toMatchObject({
      skuId: 1,
      productCode: 'M001',
      productName: '苹果',
      unit: '箱',
      quantity: 1200,
      locationId: 10,
      batchNo: 'B1',
      expireDate: '2026-12-31',
      _errors: []
    })
  })

  it('匹配不到或不合法的字段留空并记录原因', () => {
    const [line] = parsePastedLines('M999\t0\tB-01\t\t2026-02-30', ctx)
    expect(line.skuId).toBeNull()
    expect(line.locationId).toBeNull()
    expect(line.quantity).toBeNull()
    expect(line._errors).toEqual([
      '物料编码「M999」不存在',
      '库位「B-01」不属于所选仓库',
      '数量「0」须为正整数',
      '效期「2026-02-30」无法识别，应为 2026-12-31'
    ])
  })

  it('盘点单没有数量与效期列', () => {
    const [line] = parsePastedLines('M001\tA-01\tB2', { ...ctx, kind: 'check' })
    expect(line).toMatchObject({ skuId: 1, locationId: 10, batchNo: 'B2', _errors: [] })
    expect(line).not.toHaveProperty('quantity')
  })

  it('调整单：调整量可为负、不能为 0，原因可填中文名或编码，空白不设置', () => {
    const lines = parsePastedLines(
      'M001\t-3\tA-01\t\t报损\nM001\t2\tA-01\tB9\tsurplus\nM001\t0\tA-01\t\t\nM001\t1\tA-01\t\t损坏',
      {
        ...ctx,
        kind: 'adjust'
      }
    )
    expect(lines[0]).toMatchObject({ skuId: 1, quantity: -3, locationId: 10, reason: 'DAMAGE', _errors: [] })
    expect(lines[1]).toMatchObject({ quantity: 2, batchNo: 'B9', reason: 'SURPLUS', _errors: [] })
    expect(lines[2].quantity).toBeNull()
    expect(lines[2]).not.toHaveProperty('reason')
    expect(lines[2]._errors).toEqual(['调整量「0」须为非 0 整数（减少填负数）'])
    expect(lines[3]._errors[0]).toContain('原因「损坏」不存在')
  })

  it('normalizeDate 校验真实日期', () => {
    expect(normalizeDate('2026.1.5')).toBe('2026-01-05')
    expect(normalizeDate('2026-13-01')).toBeNull()
  })
})
