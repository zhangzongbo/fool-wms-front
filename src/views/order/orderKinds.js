import { inboundApi, outboundApi, checkApi } from '@/api'
import {
  INBOUND_STATUS,
  OUTBOUND_STATUS,
  CHECK_STATUS,
  INBOUND_TYPE,
  OUTBOUND_TYPE,
  CHECK_TYPE
} from '@/constants/dict'

/**
 * 三类单据的差异配置：编辑页（OrderEdit）、详情页（OrderDetail）与路由共用
 * 单头字段：party（供应商 / 客户）、expectedDate（预计日期，D2）只有入库 / 出库有；盘点有库区
 */
export const ORDER_KINDS = {
  inbound: {
    kind: 'inbound',
    label: '入库单',
    listPath: '/inbound',
    listTitle: '入库管理',
    api: inboundApi,
    statusDict: INBOUND_STATUS,
    typeDict: INBOUND_TYPE,
    codeKey: 'inboundCode',
    typeKey: 'inboundType',
    defaultType: 'PURCHASE',
    party: { key: 'supplierName', label: '供应商', required: true },
    expectedDate: { key: 'expectedArrivalDate', label: '预计到货日期' },
    perm: (p) => `sys:inbound:${p}`,
    refKeys: ['owners', 'warehouses', 'locations', 'materials']
  },
  outbound: {
    kind: 'outbound',
    label: '出库单',
    listPath: '/outbound',
    listTitle: '出库管理',
    api: outboundApi,
    statusDict: OUTBOUND_STATUS,
    typeDict: OUTBOUND_TYPE,
    codeKey: 'outboundCode',
    typeKey: 'outboundType',
    defaultType: 'SALE',
    party: { key: 'customerName', label: '客户', required: true },
    expectedDate: { key: 'expectedShipDate', label: '预计发货日期' },
    perm: (p) => `sys:outbound:${p}`,
    refKeys: ['owners', 'warehouses', 'locations', 'materials']
  },
  check: {
    kind: 'check',
    label: '盘点单',
    listPath: '/check',
    listTitle: '盘点管理',
    api: checkApi,
    statusDict: CHECK_STATUS,
    typeDict: CHECK_TYPE,
    codeKey: 'checkCode',
    typeKey: 'checkType',
    defaultType: 'FULL',
    party: null,
    expectedDate: null,
    perm: (p) => `sys:check:${p}`,
    refKeys: ['owners', 'warehouses', 'areas', 'locations', 'materials']
  }
}
