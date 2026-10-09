/**
 * 从 Excel 复制粘贴的明细解析（TSV：列以制表符分隔、行以换行分隔）
 * 列顺序按单据类型固定，见 PASTE_COLUMNS；首行为表头（首列为「物料编码」）时自动跳过
 */
export const PASTE_COLUMNS = {
  inbound: ['materialCode', 'quantity', 'locationCode', 'batchNo', 'expireDate'],
  outbound: ['materialCode', 'quantity', 'locationCode', 'batchNo'],
  check: ['materialCode', 'locationCode', 'batchNo']
}

export const PASTE_COLUMN_LABELS = {
  materialCode: '物料编码',
  quantity: '数量',
  locationCode: '库位编码',
  batchNo: '批次',
  expireDate: '效期'
}

const pad = (n) => String(n).padStart(2, '0')

/** 日期统一为 YYYY-MM-DD：支持 2026-12-31、2026/12/31、2026.12.31；无法识别返回 null */
export function normalizeDate(value) {
  const m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(String(value).trim())
  if (!m) return null
  const [, y, mo, d] = m.map(Number)
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return `${y}-${pad(mo)}-${pad(d)}`
}

/**
 * @param {string} text 粘贴的文本
 * @param {{ kind: 'inbound'|'outbound'|'check', materialsByCode: Map, locationsByCode: Map, warehouseId?: number }} ctx
 * @returns {Array<object>} 明细行；无法识别的字段留空，行上 _errors 列出原因（可在表格中修正后保存）
 */
export function parsePastedLines(text, { kind, materialsByCode, locationsByCode, warehouseId }) {
  const columns = PASTE_COLUMNS[kind]
  const rows = String(text || '')
    .split(/\r?\n/)
    .map((r) => r.split('\t').map((c) => c.trim()))
    .filter((cells) => cells.some((c) => c !== ''))
  if (rows.length && rows[0][0] === PASTE_COLUMN_LABELS.materialCode) rows.shift()

  return rows.map((cells) => {
    const raw = Object.fromEntries(columns.map((key, i) => [key, cells[i] ?? '']))
    const errors = []
    const line = { skuId: null, productCode: raw.materialCode, productName: '', unit: '', locationId: null }
    line.batchNo = raw.batchNo || ''

    const material = materialsByCode.get(raw.materialCode)
    if (!raw.materialCode) errors.push('缺少物料编码')
    else if (!material) errors.push(`物料编码「${raw.materialCode}」不存在`)
    else Object.assign(line, { skuId: material.id, productName: material.materialName, unit: material.unit || '' })

    const location = locationsByCode.get(raw.locationCode)
    if (!raw.locationCode) errors.push('缺少库位编码')
    else if (!location) errors.push(`库位编码「${raw.locationCode}」不存在`)
    else if (warehouseId != null && location.warehouseId !== warehouseId)
      errors.push(`库位「${raw.locationCode}」不属于所选仓库`)
    else line.locationId = location.id

    if (columns.includes('quantity')) {
      const qty = Number(raw.quantity.replace(/,/g, ''))
      if (!Number.isInteger(qty) || qty <= 0) {
        errors.push(`数量「${raw.quantity}」须为正整数`)
        line.quantity = null
      } else {
        line.quantity = qty
      }
    }
    if (columns.includes('expireDate')) {
      line.expireDate = raw.expireDate ? normalizeDate(raw.expireDate) : null
      if (raw.expireDate && !line.expireDate) errors.push(`效期「${raw.expireDate}」无法识别，应为 2026-12-31`)
    }
    line._errors = errors
    return line
  })
}
