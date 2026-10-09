import { inboundApi, outboundApi, checkApi } from '@/api'
import { confirmAction } from '@/utils/confirm'

/**
 * 单据操作（列表页行操作、详情页按钮共用）：状态流转、删除、进入编辑
 * 动作按优先级排列：状态推进 > 编辑 > 危险操作（溢出时危险操作收进「更多」，见 RowActions）
 */
const CONFIG = {
  inbound: {
    api: inboundApi,
    label: '入库单',
    codeOf: (o) => o.inboundCode,
    perm: (p) => `sys:inbound:${p}`,
    cancellable: ['DRAFT', 'AUDITED'],
    advance: (o, h) => [
      {
        label: '审核',
        show: o.status === 'DRAFT',
        perm: 'sys:inbound:status',
        onClick: () => h.transit(o, 'AUDITED', '审核')
      },
      {
        label: '完成入库',
        show: o.status === 'AUDITED',
        perm: 'sys:inbound:complete',
        onClick: () =>
          h.confirm('完成入库将按明细增加库存并写入流水，确定继续？', () => inboundApi.complete(o.id), {
            title: '完成入库',
            confirmButtonText: '完成入库',
            successText: '入库完成'
          })
      }
    ],
    cancel: (o, h) => h.transit(o, 'CANCELLED', '取消')
  },
  outbound: {
    api: outboundApi,
    label: '出库单',
    codeOf: (o) => o.outboundCode,
    perm: (p) => `sys:outbound:${p}`,
    cancellable: ['DRAFT', 'AUDITED', 'ALLOCATED'],
    cancelPerm: 'sys:outbound:cancel',
    advance: (o, h) => [
      {
        label: '审核',
        show: o.status === 'DRAFT',
        perm: 'sys:outbound:status',
        onClick: () => h.transit(o, 'AUDITED', '审核')
      },
      {
        label: '分配',
        show: o.status === 'AUDITED',
        perm: 'sys:outbound:allocate',
        onClick: () =>
          h.confirm('分配将按明细冻结可用库存，确定继续？', () => outboundApi.allocate(o.id), {
            title: '库存分配',
            confirmButtonText: '分配',
            successText: '分配成功'
          })
      },
      {
        label: '发货',
        show: o.status === 'ALLOCATED',
        perm: 'sys:outbound:ship',
        onClick: () =>
          h.confirm('发货将消耗冻结库存并出库、写入流水，确定继续？', () => outboundApi.ship(o.id), {
            title: '确认发货',
            confirmButtonText: '发货',
            successText: '发货成功'
          })
      }
    ],
    // 已分配的出库单取消时释放冻结库存，走专用接口
    cancel: (o, h) => {
      const allocated = o.status === 'ALLOCATED'
      const msg = allocated
        ? `出库单「${o.outboundCode}」已分配，取消将释放已冻结的库存，确定取消？`
        : `确定取消出库单「${o.outboundCode}」吗？`
      return h.confirm(msg, () => outboundApi.cancel(o.id), {
        title: '取消出库单',
        confirmButtonText: '确定取消',
        successText: allocated ? '已取消并释放冻结库存' : '已取消'
      })
    }
  },
  check: {
    api: checkApi,
    label: '盘点单',
    codeOf: (o) => o.checkCode,
    perm: (p) => `sys:check:${p}`,
    cancellable: ['DRAFT', 'CHECKING'],
    advance: (o, h) => [
      {
        label: '开始盘点',
        show: o.status === 'DRAFT',
        perm: 'sys:check:status',
        onClick: () => h.transit(o, 'CHECKING', '开始盘点')
      },
      // 盘点中在编辑页的录入模式中批量录入实盘量
      { label: '录入实盘', show: o.status === 'CHECKING', perm: 'sys:check:update', onClick: () => h.edit(o) },
      {
        label: '完成盘点',
        show: o.status === 'CHECKING',
        perm: 'sys:check:status',
        onClick: () => h.transit(o, 'COUNTED', '完成盘点')
      },
      {
        label: '过账',
        show: o.status === 'COUNTED',
        perm: 'sys:check:post',
        onClick: () =>
          h.confirm('过账将按盘点差异调整库存（盘盈增加 / 盘亏扣减），确定继续？', () => checkApi.post(o.id), {
            title: '盘点过账',
            confirmButtonText: '过账',
            successText: '过账成功'
          })
      }
    ],
    cancel: (o, h) => h.transit(o, 'CANCELLED', '取消')
  }
}

/**
 * @param {'inbound'|'outbound'|'check'} kind
 * @param {{ onChanged: Function, onDeleted?: Function, onView?: Function, onEdit: Function }} handlers
 *   onChanged：状态变更成功后刷新；onDeleted：删除成功后（详情页返回列表，默认同 onChanged）；
 *   onView：传入时动作列表首项为「明细」（列表页用）；onEdit：进入编辑页
 */
export function useOrderActions(kind, { onChanged, onDeleted = onChanged, onView, onEdit }) {
  const c = CONFIG[kind]
  const confirm = (message, action, options = {}) =>
    confirmAction(message, action, { ...options, onSuccess: onChanged })
  const helpers = {
    confirm,
    transit: (o, status, label) =>
      confirm(`确定${label}${c.label}「${c.codeOf(o)}」吗？`, () => c.api.changeStatus(o.id, status), {
        successText: `${label}成功`
      }),
    edit: (o) => onEdit(o)
  }
  const remove = (o) =>
    confirmAction(`确定删除${c.label}「${c.codeOf(o)}」吗？`, () => c.api.delete(o.id), {
      successText: '删除成功',
      onSuccess: onDeleted
    })

  /** 某张单据当前可用的操作（含状态与权限声明，交给 RowActions 过滤） */
  const actionsOf = (o) => {
    const draft = o.status === 'DRAFT'
    return [
      ...(onView ? [{ label: '明细', onClick: () => onView(o) }] : []),
      ...c.advance(o, helpers).map((a) => ({ type: 'success', ...a })),
      { label: '编辑', show: draft, perm: c.perm('update'), onClick: () => onEdit(o) },
      {
        label: '取消',
        show: c.cancellable.includes(o.status),
        perm: c.cancelPerm || c.perm('status'),
        danger: true,
        type: 'warning',
        onClick: () => c.cancel(o, helpers)
      },
      { label: '删除', show: draft, perm: c.perm('delete'), danger: true, onClick: () => remove(o) }
    ]
  }

  return { actionsOf, label: c.label, codeOf: c.codeOf }
}
