import { ElMessage } from 'element-plus'
import request, { handleUnauthorized } from '@/utils/request'

/**
 * 从 Content-Disposition 解析文件名：优先 RFC 5987 的 filename*=utf-8''…，其次 filename="…"
 * @param {string} header
 * @returns {string} 解析不到时返回 ''
 */
export function parseFileName(header) {
  if (!header) return ''
  const star = /filename\*\s*=\s*(?:utf-8|UTF-8)''([^;]+)/.exec(header)
  if (star) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch (e) {
      return star[1].trim()
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header)
  if (!plain) return ''
  try {
    return decodeURIComponent(plain[1].trim())
  } catch (e) {
    return plain[1].trim()
  }
}

/**
 * 后端出错时仍返回 HTTP 200 + JSON（Result），以 blob 接收会被当成文件；这里识别并取出业务错误
 * @param {Blob} blob
 * @returns {Promise<{ code: number, message: string } | null>} 不是 JSON 错误体时返回 null
 */
export async function readBlobError(blob) {
  if (!blob || !String(blob.type).includes('application/json')) return null
  try {
    const body = JSON.parse(await blob.text())
    return { code: body.code, message: body.message || '下载失败' }
  } catch (e) {
    return { code: 500, message: '下载失败' }
  }
}

/** 以 blob 请求文件；业务错误统一提示并抛出 */
async function fetchBlob(url, { method = 'post', data, params, timeout = 120000 } = {}) {
  const res = await request({ url, method, data, params, timeout, responseType: 'blob', rawResponse: true })
  const error = await readBlobError(res.data)
  if (error) {
    if (error.code === 401) handleUnauthorized()
    else ElMessage.error(error.message)
    throw new Error(error.message)
  }
  return res
}

const saveBlob = (blob, name) => {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 0)
}

/**
 * 下载文件（POST 导出 / GET PDF）：文件名取自 Content-Disposition
 * 导出为服务端流式写出，超时放宽到 2 分钟；写出前的错误（超出上限、无权限等）以 JSON 返回并提示
 */
export async function downloadFile(url, { method = 'post', data, params, timeout, fallbackName = 'download' } = {}) {
  const res = await fetchBlob(url, { method, data, params, timeout })
  saveBlob(res.data, parseFileName(res.headers?.['content-disposition']) || fallbackName)
}

/**
 * 获取 PDF 并在新标签页打开（浏览器预览自带打印）
 * 新窗口须在用户点击时同步打开，否则会被拦截；请求失败时关闭该窗口
 */
export async function openPdf(url, params) {
  const win = window.open('', '_blank')
  try {
    const res = await fetchBlob(url, { method: 'get', params })
    const href = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    if (win) win.location.href = href
    else window.open(href, '_blank')
    setTimeout(() => URL.revokeObjectURL(href), 60000)
  } catch (e) {
    win?.close()
    throw e
  }
}
