import { describe, it, expect, vi } from 'vitest'

vi.mock('@/utils/request', () => ({ default: vi.fn(), handleUnauthorized: vi.fn() }))
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))

import { parseFileName, readBlobError } from './download'

describe('download', () => {
  it('parseFileName：优先 RFC 5987 编码的中文文件名', () => {
    const header = 'attachment; filename="export.xlsx"; filename*=utf-8\'\'%E5%85%A5%E5%BA%93%E5%8D%95_20261009.xlsx'
    expect(parseFileName(header)).toBe('入库单_20261009.xlsx')
    expect(parseFileName('inline; filename="IN202610090001.pdf"')).toBe('IN202610090001.pdf')
    expect(parseFileName('attachment;filename=%E7%BB%93%E7%AE%97%E5%8D%95.xlsx')).toBe('结算单.xlsx')
    expect(parseFileName(undefined)).toBe('')
  })

  it('readBlobError：识别 200 + JSON 的业务错误，文件内容返回 null', async () => {
    const json = new Blob([JSON.stringify({ code: 500, message: '超出导出上限' })], { type: 'application/json' })
    expect(await readBlobError(json)).toEqual({ code: 500, message: '超出导出上限' })
    const xlsx = new Blob(['PK'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    expect(await readBlobError(xlsx)).toBeNull()
  })
})
