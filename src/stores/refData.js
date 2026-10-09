import { defineStore } from 'pinia'
import { reactive, toRefs, computed } from 'vue'
import { ownerApi, warehouseApi, warehouseAreaApi, locationApi, materialApi } from '@/api'

const LOADERS = {
  // 均为 GET /all 全量接口；/owner/all 仅需登录，按数据范围返回
  owners: () => ownerApi.all(),
  warehouses: () => warehouseApi.getAllWarehouses(),
  areas: () => warehouseAreaApi.all(),
  locations: () => locationApi.all(),
  materials: () => materialApi.getAllMaterials()
}

const toMap = (list, labelKey) => Object.fromEntries(list.map((x) => [x.id, x[labelKey]]))

/**
 * 参考数据缓存：货主 / 仓库 / 库区 / 库位 / 物料
 * 各业务页按需 ensure，同一会话内只拉取一次；对应主数据页增删改后 invalidate，刷新按钮可强制重拉。
 * 货主受数据范围约束，登录 / 登出时由 user store 调用 reset。
 */
export const useRefDataStore = defineStore('refData', () => {
  const data = reactive({ owners: [], warehouses: [], areas: [], locations: [], materials: [] })
  const pending = {}

  /** 加载指定参考数据，已加载过的直接复用；单项失败不影响其他项 */
  const ensure = (keys, { force = false } = {}) =>
    Promise.allSettled(
      keys.map((key) => {
        if (force || !pending[key]) {
          pending[key] = LOADERS[key]()
            .then((list) => {
              data[key] = list || []
            })
            .catch((e) => {
              delete pending[key]
              throw e
            })
        }
        return pending[key]
      })
    )

  /** 标记数据已变更，下次 ensure 时重新拉取 */
  const invalidate = (...keys) =>
    keys.forEach((key) => {
      delete pending[key]
    })

  const reset = () => {
    invalidate(...Object.keys(LOADERS))
    Object.keys(data).forEach((key) => {
      data[key] = []
    })
  }

  const ownerMap = computed(() => toMap(data.owners, 'ownerName'))
  const warehouseMap = computed(() => toMap(data.warehouses, 'warehouseName'))
  const areaMap = computed(() => toMap(data.areas, 'areaName'))
  const locationMap = computed(() => toMap(data.locations, 'locationCode'))
  const ownerName = (id) => ownerMap.value[id] || '-'
  const warehouseName = (id) => warehouseMap.value[id] || '-'
  const areaName = (id) => areaMap.value[id] || '-'
  // 库位不在缓存中（如已删除）时显示 #id，便于排查
  const locationCode = (id) => (id == null ? '-' : locationMap.value[id] || `#${id}`)

  return { ...toRefs(data), ensure, invalidate, reset, ownerName, warehouseName, areaName, locationCode }
})
