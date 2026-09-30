import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn() },
  ElMessageBox: { confirm: vi.fn() }
}))
import { ElMessage, ElMessageBox } from 'element-plus'
import { confirmAction } from './confirm'

describe('confirmAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('取消时不执行操作', async () => {
    ElMessageBox.confirm.mockRejectedValue('cancel')
    const action = vi.fn()
    expect(await confirmAction('确定？', action)).toBe(false)
    expect(action).not.toHaveBeenCalled()
  })

  it('确认后执行操作、提示并回调', async () => {
    ElMessageBox.confirm.mockResolvedValue('confirm')
    const action = vi.fn(() => Promise.resolve())
    const onSuccess = vi.fn()
    const ok = await confirmAction('确定删除？', action, { title: '删除确认', confirmButtonText: '删除', successText: '删除成功', onSuccess })
    expect(ok).toBe(true)
    expect(ElMessageBox.confirm).toHaveBeenCalledWith('确定删除？', '删除确认', { type: 'warning', confirmButtonText: '删除' })
    expect(ElMessage.success).toHaveBeenCalledWith('删除成功')
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('操作失败时返回 false，不提示成功、不回调', async () => {
    ElMessageBox.confirm.mockResolvedValue('confirm')
    const onSuccess = vi.fn()
    expect(await confirmAction('确定？', () => Promise.reject(new Error('500')), { successText: 'ok', onSuccess })).toBe(false)
    expect(ElMessage.success).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
