import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/confirm', () => ({
  // 测试中视为用户已确认：执行操作并回调
  confirmAction: vi.fn(async (msg, action, { onSuccess } = {}) => {
    await action()
    onSuccess?.()
    return true
  })
}))
vi.mock('@/api', () => {
  const api = () => ({
    changeStatus: vi.fn(),
    delete: vi.fn(),
    complete: vi.fn(),
    allocate: vi.fn(),
    ship: vi.fn(),
    cancel: vi.fn(),
    post: vi.fn(),
    submit: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn()
  })
  return { inboundApi: api(), outboundApi: api(), checkApi: api(), adjustApi: api() }
})
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ userInfo: { username: 'maker' } }) }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn() },
  ElMessageBox: { prompt: vi.fn(async () => ({ value: '  数量不对  ' })) }
}))

import { confirmAction } from '@/utils/confirm'
import { ElMessageBox } from 'element-plus'
import { inboundApi, outboundApi, checkApi, adjustApi } from '@/api'
import { useOrderActions } from './useOrderActions'

const visible = (list) => list.filter((a) => a.show !== false).map((a) => a.label)
const find = (list, label) => list.find((a) => a.label === label)

describe('useOrderActions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('入库草稿：明细 / 审核 / 编辑 / 取消 / 删除，审核后刷新', async () => {
    const onChanged = vi.fn()
    const { actionsOf } = useOrderActions('inbound', { onChanged, onView: vi.fn(), onEdit: vi.fn() })
    const actions = actionsOf({ id: 1, inboundCode: 'IN1', status: 'DRAFT' })
    expect(visible(actions)).toEqual(['明细', '审核', '编辑', '取消', '删除'])
    await find(actions, '审核').onClick()
    expect(inboundApi.changeStatus).toHaveBeenCalledWith(1, 'AUDITED')
    expect(onChanged).toHaveBeenCalled()
  })

  it('详情页不含「明细」；删除成功走 onDeleted', async () => {
    const onDeleted = vi.fn()
    const { actionsOf } = useOrderActions('inbound', { onChanged: vi.fn(), onDeleted, onEdit: vi.fn() })
    const actions = actionsOf({ id: 2, inboundCode: 'IN2', status: 'DRAFT' })
    expect(find(actions, '明细')).toBeUndefined()
    await find(actions, '删除').onClick()
    expect(inboundApi.delete).toHaveBeenCalledWith(2)
    expect(onDeleted).toHaveBeenCalled()
  })

  it('出库已分配：发货可见，取消走专用接口并提示释放冻结', async () => {
    const { actionsOf } = useOrderActions('outbound', { onChanged: vi.fn(), onEdit: vi.fn() })
    const actions = actionsOf({ id: 3, outboundCode: 'OUT3', status: 'ALLOCATED' })
    expect(visible(actions)).toEqual(['发货', '取消'])
    expect(find(actions, '取消').perm).toBe('sys:outbound:cancel')
    await find(actions, '取消').onClick()
    expect(outboundApi.cancel).toHaveBeenCalledWith(3)
    expect(confirmAction.mock.calls[0][0]).toContain('释放已冻结的库存')
  })

  it('盘点中：录入实盘进入编辑页、完成盘点、取消', () => {
    const onEdit = vi.fn()
    const { actionsOf } = useOrderActions('check', { onChanged: vi.fn(), onEdit })
    const order = { id: 4, checkCode: 'CHK4', status: 'CHECKING' }
    const actions = actionsOf(order)
    expect(visible(actions)).toEqual(['录入实盘', '完成盘点', '取消'])
    find(actions, '录入实盘').onClick()
    expect(onEdit).toHaveBeenCalledWith(order)
    expect(checkApi.post).not.toHaveBeenCalled()
  })

  it('调整单草稿：提交 / 编辑 / 取消 / 删除，取消走专用接口与权限', async () => {
    const { actionsOf } = useOrderActions('adjust', { onChanged: vi.fn(), onEdit: vi.fn() })
    const actions = actionsOf({ id: 5, adjustCode: 'ADJ5', status: 'DRAFT', createByCode: 'maker' })
    expect(visible(actions)).toEqual(['提交', '编辑', '取消', '删除'])
    expect(find(actions, '提交').perm).toBe('sys:adjust:submit')
    expect(find(actions, '取消').perm).toBe('sys:adjust:cancel')
    await find(actions, '提交').onClick()
    expect(adjustApi.submit).toHaveBeenCalledWith(5)
    await find(actions, '取消').onClick()
    expect(adjustApi.cancel).toHaveBeenCalledWith(5)
  })

  it('调整单待审批：创建人看不到「审批」，其他人可审批；驳回须填原因', async () => {
    const onChanged = vi.fn()
    const { actionsOf } = useOrderActions('adjust', { onChanged, onEdit: vi.fn() })
    const mine = actionsOf({ id: 6, adjustCode: 'ADJ6', status: 'PENDING', createByCode: 'maker' })
    expect(visible(mine)).toEqual(['驳回', '取消'])

    const others = actionsOf({ id: 6, adjustCode: 'ADJ6', status: 'PENDING', createByCode: 'someone' })
    expect(visible(others)).toEqual(['审批', '驳回', '取消'])
    expect(find(others, '审批').perm).toBe('sys:adjust:approve')
    await find(others, '审批').onClick()
    expect(adjustApi.approve).toHaveBeenCalledWith(6)

    await find(others, '驳回').onClick()
    expect(ElMessageBox.prompt).toHaveBeenCalled()
    expect(adjustApi.reject).toHaveBeenCalledWith(6, '数量不对')
    expect(onChanged).toHaveBeenCalled()
  })

  it('调整单已审批：无任何操作', () => {
    const { actionsOf } = useOrderActions('adjust', { onChanged: vi.fn(), onEdit: vi.fn() })
    expect(visible(actionsOf({ id: 7, adjustCode: 'ADJ7', status: 'APPROVED', createByCode: 'x' }))).toEqual([])
  })
})
