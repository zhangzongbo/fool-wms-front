import request from '@/utils/request'

// 列表约定：page(params) = POST /{资源}/list 分页（请求体 pageNum / pageSize / 筛选字段，返回 PageResult）；
// all() = GET /{资源}/all 全量，供下拉等参考数据使用（见 stores/refData）

// ============ 认证鉴权 ============
export const authApi = {
  login: (data) => request({ url: '/auth/login', method: 'post', data }),
  logout: () => request({ url: '/auth/logout', method: 'post' }),
  me: () => request({ url: '/auth/me', method: 'get' })
}

// ============ 仪表盘 ============
export const dashboardApi = {
  stats: () => request({ url: '/dashboard/stats', method: 'get' })
}

// ============ 货主管理 ============
export const ownerApi = {
  page: (data) => request({ url: '/owner/list', method: 'post', data }),
  all: () => request({ url: '/owner/all', method: 'get' }),
  getById: (id) => request({ url: `/owner/${id}`, method: 'get' }),
  add: (data) => request({ url: '/owner/add', method: 'post', data }),
  update: (id, data) => request({ url: `/owner/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/owner/${id}`, method: 'delete' })
}

// ============ 仓库管理（兼容既有视图命名） ============
export const warehouseApi = {
  getWarehouseList: (params) => request({ url: '/warehouse/list', method: 'post', data: params }),
  getAllWarehouses: () => request({ url: '/warehouse/all', method: 'get' }),
  getWarehouseDetail: (id) => request({ url: `/warehouse/${id}`, method: 'get' }),
  createWarehouse: (data) => request({ url: '/warehouse/add', method: 'post', data }),
  updateWarehouse: (id, data) => request({ url: `/warehouse/${id}`, method: 'put', data }),
  deleteWarehouse: (id) => request({ url: `/warehouse/${id}`, method: 'delete' }),
  enableWarehouse: (id) => request({ url: `/warehouse/${id}/enable`, method: 'put' }),
  disableWarehouse: (id) => request({ url: `/warehouse/${id}/disable`, method: 'put' })
}

// ============ 库区管理 ============
export const warehouseAreaApi = {
  page: (data) => request({ url: '/warehouse-area/list', method: 'post', data }),
  all: () => request({ url: '/warehouse-area/all', method: 'get' }),
  getById: (id) => request({ url: `/warehouse-area/${id}`, method: 'get' }),
  add: (data) => request({ url: '/warehouse-area/add', method: 'post', data }),
  update: (id, data) => request({ url: `/warehouse-area/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/warehouse-area/${id}`, method: 'delete' })
}

// ============ 库位管理 ============
export const locationApi = {
  page: (data) => request({ url: '/location/list', method: 'post', data }),
  all: () => request({ url: '/location/all', method: 'get' }),
  getById: (id) => request({ url: `/location/${id}`, method: 'get' }),
  add: (data) => request({ url: '/location/add', method: 'post', data }),
  update: (id, data) => request({ url: `/location/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/location/${id}`, method: 'delete' }),
  listByWarehouseAndArea: (warehouseId, areaId) =>
    request({ url: '/location/list/by-warehouse-and-area', method: 'get', params: { warehouseId, areaId } })
}

// ============ 物料管理（兼容既有视图命名） ============
export const materialApi = {
  getAllMaterials: () => request({ url: '/material/all', method: 'get' }),
  getMaterialList: (params = {}) => request({ url: '/material/list', method: 'post', data: params }),
  getMaterialDetail: (id) => request({ url: `/material/${id}`, method: 'get' }),
  createMaterial: (data) => request({ url: '/material/add', method: 'post', data }),
  updateMaterial: (id, data) => request({ url: `/material/${id}`, method: 'put', data }),
  deleteMaterial: (id) => request({ url: `/material/${id}`, method: 'delete' })
}

// ============ 库存管理 ============
// 库存只读：变动只能由入库完成 / 出库分配·发货 / 盘点过账驱动，后端不提供直接写接口
export const inventoryApi = {
  page: (data) => request({ url: '/inventory/list', method: 'post', data }),
  getById: (id) => request({ url: `/inventory/${id}`, method: 'get' })
}

// ============ 入库单 ============
export const inboundApi = {
  page: (data) => request({ url: '/inbound-order/list', method: 'post', data }),
  // 详情页 / 编辑页（spec #14）：整单保存（单头 + 明细，一个事务）、详情视图、状态日志、库存流水
  createFull: (data) => request({ url: '/inbound-order/full', method: 'post', data }),
  updateFull: (id, data) => request({ url: `/inbound-order/${id}/full`, method: 'put', data }),
  view: (id) => request({ url: `/inbound-order/${id}/view`, method: 'get' }),
  logs: (id) => request({ url: `/inbound-order/${id}/logs`, method: 'get' }),
  transactions: (id) => request({ url: `/inbound-order/${id}/transactions`, method: 'get' }),
  getById: (id) => request({ url: `/inbound-order/${id}`, method: 'get' }),
  add: (data) => request({ url: '/inbound-order/add', method: 'post', data }),
  update: (id, data) => request({ url: `/inbound-order/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/inbound-order/${id}`, method: 'delete' }),
  changeStatus: (id, target) => request({ url: `/inbound-order/${id}/status`, method: 'post', params: { target } }),
  complete: (id) => request({ url: `/inbound-order/${id}/complete`, method: 'post' })
}

export const inboundDetailApi = {
  list: (inboundId) => request({ url: '/inbound-order-detail/list', method: 'get', params: { inboundId } }),
  add: (data) => request({ url: '/inbound-order-detail/add', method: 'post', data }),
  update: (id, data) => request({ url: `/inbound-order-detail/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/inbound-order-detail/${id}`, method: 'delete' })
}

// ============ 出库单 ============
export const outboundApi = {
  page: (data) => request({ url: '/outbound-order/list', method: 'post', data }),
  // 详情页 / 编辑页（spec #14）：整单保存（单头 + 明细，一个事务）、详情视图、状态日志、库存流水
  createFull: (data) => request({ url: '/outbound-order/full', method: 'post', data }),
  updateFull: (id, data) => request({ url: `/outbound-order/${id}/full`, method: 'put', data }),
  view: (id) => request({ url: `/outbound-order/${id}/view`, method: 'get' }),
  logs: (id) => request({ url: `/outbound-order/${id}/logs`, method: 'get' }),
  transactions: (id) => request({ url: `/outbound-order/${id}/transactions`, method: 'get' }),
  getById: (id) => request({ url: `/outbound-order/${id}`, method: 'get' }),
  add: (data) => request({ url: '/outbound-order/add', method: 'post', data }),
  update: (id, data) => request({ url: `/outbound-order/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/outbound-order/${id}`, method: 'delete' }),
  changeStatus: (id, target) => request({ url: `/outbound-order/${id}/status`, method: 'post', params: { target } }),
  allocate: (id) => request({ url: `/outbound-order/${id}/allocate`, method: 'post' }),
  ship: (id) => request({ url: `/outbound-order/${id}/ship`, method: 'post' }),
  cancel: (id) => request({ url: `/outbound-order/${id}/cancel`, method: 'post' })
}

export const outboundDetailApi = {
  list: (outboundId) => request({ url: '/outbound-order-detail/list', method: 'get', params: { outboundId } }),
  add: (data) => request({ url: '/outbound-order-detail/add', method: 'post', data }),
  update: (id, data) => request({ url: `/outbound-order-detail/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/outbound-order-detail/${id}`, method: 'delete' })
}

// ============ 盘点单 ============
export const checkApi = {
  page: (data) => request({ url: '/inventory-check/list', method: 'post', data }),
  // 详情页 / 编辑页（spec #14）：整单保存（单头 + 明细，一个事务）、详情视图、状态日志、库存流水
  createFull: (data) => request({ url: '/inventory-check/full', method: 'post', data }),
  updateFull: (id, data) => request({ url: `/inventory-check/${id}/full`, method: 'put', data }),
  view: (id) => request({ url: `/inventory-check/${id}/view`, method: 'get' }),
  logs: (id) => request({ url: `/inventory-check/${id}/logs`, method: 'get' }),
  transactions: (id) => request({ url: `/inventory-check/${id}/transactions`, method: 'get' }),
  // 盘点中批量录入实盘量 / 备注
  saveCounts: (id, data) => request({ url: `/inventory-check/${id}/counts`, method: 'put', data }),
  getById: (id) => request({ url: `/inventory-check/${id}`, method: 'get' }),
  add: (data) => request({ url: '/inventory-check/add', method: 'post', data }),
  update: (id, data) => request({ url: `/inventory-check/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/inventory-check/${id}`, method: 'delete' }),
  changeStatus: (id, target) => request({ url: `/inventory-check/${id}/status`, method: 'post', params: { target } }),
  post: (id) => request({ url: `/inventory-check/${id}/post`, method: 'post' })
}

export const checkDetailApi = {
  list: (checkId) => request({ url: '/inventory-check-detail/list', method: 'get', params: { checkId } }),
  add: (data) => request({ url: '/inventory-check-detail/add', method: 'post', data }),
  update: (id, data) => request({ url: `/inventory-check-detail/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/inventory-check-detail/${id}`, method: 'delete' })
}

// ============ 系统 - 用户 ============
export const userApi = {
  page: (data) => request({ url: '/user/list', method: 'post', data }),
  add: (data) => request({ url: '/user/add', method: 'post', data }),
  update: (id, data) => request({ url: `/user/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/user/${id}`, method: 'delete' }),
  resetPassword: (id, password) => request({ url: `/user/${id}/password`, method: 'put', data: { password } }),
  getRoleIds: (id) => request({ url: `/user/${id}/roles`, method: 'get' }),
  getOwnerIds: (id) => request({ url: `/user/${id}/owners`, method: 'get' }),
  assignRoles: (id, roleIds) => request({ url: `/user/${id}/roles`, method: 'post', data: { roleIds } }),
  assignOwners: (id, dataScope, ownerIds) =>
    request({ url: `/user/${id}/owners`, method: 'post', data: { dataScope, ownerIds } })
}

// ============ 系统 - 角色 ============
export const roleApi = {
  list: () => request({ url: '/role/list', method: 'get' }),
  add: (data) => request({ url: '/role/add', method: 'post', data }),
  update: (id, data) => request({ url: `/role/${id}`, method: 'put', data }),
  delete: (id) => request({ url: `/role/${id}`, method: 'delete' }),
  getPermissionIds: (id) => request({ url: `/role/${id}/permissions`, method: 'get' }),
  assignPermissions: (id, permissionIds) =>
    request({ url: `/role/${id}/permissions`, method: 'post', data: { permissionIds } })
}

// ============ 系统 - 权限 ============
export const permissionApi = {
  list: () => request({ url: '/permission/list', method: 'get' }),
  add: (data) => request({ url: '/permission/add', method: 'post', data }),
  delete: (id) => request({ url: `/permission/${id}`, method: 'delete' })
}

// ============ 导出 / PDF（spec #14，配合 utils/download 的 downloadFile / openPdf 使用） ============
export const EXPORT_URLS = {
  inbound: '/inbound-order/export',
  outbound: '/outbound-order/export',
  check: '/inventory-check/export',
  inventory: '/inventory/export'
}
export const pdfUrl = (kind, id) => `/${kind === 'inbound' ? 'inbound-order' : 'outbound-order'}/${id}/pdf`
