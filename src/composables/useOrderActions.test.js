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
    post: vi.fn()
  })
  return { inboundApi: api(), outboundApi: api(), checkApi: api() }
})

import { confirmAction } from '@/utils/confirm'
import { inboundApi, outboundApi, checkApi } from '@/api'
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
})
