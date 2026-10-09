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

  it('normalizeDate 校验真实日期', () => {
    expect(normalizeDate('2026.1.5')).toBe('2026-01-05')
    expect(normalizeDate('2026-13-01')).toBeNull()
  })
})
