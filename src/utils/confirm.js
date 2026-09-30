import { ElMessage, ElMessageBox } from 'element-plus'

/**
 * 二次确认后执行操作：确认 → 调用接口 → 成功提示 → 回调
 * 取消或接口失败时静默返回 false（接口错误提示已由请求拦截器统一弹出）
 * @param {string} message 确认文案
 * @param {() => Promise} action 确认后执行的操作
 * @param {object} [options]
 * @param {string} [options.title] 确认框标题
 * @param {string} [options.confirmButtonText] 确认按钮文案
 * @param {string} [options.successText] 成功提示
 * @param {() => void} [options.onSuccess] 成功后回调（通常为刷新列表）
 * @returns {Promise<boolean>} 是否执行成功
 */
export async function confirmAction(
  message,
  action,
  { title = '提示', confirmButtonText, successText, onSuccess } = {}
) {
  try {
    await ElMessageBox.confirm(message, title, { type: 'warning', ...(confirmButtonText ? { confirmButtonText } : {}) })
  } catch (e) {
    return false
  }
  try {
    await action()
  } catch (e) {
    return false
  }
  if (successText) ElMessage.success(successText)
  onSuccess?.()
  return true
}
