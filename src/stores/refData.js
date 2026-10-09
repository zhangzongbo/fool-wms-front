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

// 名称查不到时自动重拉的最短间隔（同一类数据），避免全量接口被反复请求
export const MISS_REFRESH_INTERVAL = 30 * 1000
// 标签页重新可见时，超过该时长未加载的数据在后台刷新
export const STALE_AFTER = 5 * 60 * 1000

/**
 * 参考数据缓存：货主 / 仓库 / 库区 / 库位 / 物料
 * 各业务页按需 ensure，同一会话内只拉取一次；对应主数据页增删改后 invalidate，刷新按钮可强制重拉。
 * 货主受数据范围约束，登录 / 登出时由 user store 调用 reset。
 * 自动刷新（一次登录内缓存不再一成不变）：
 * - 名称查不到（如他人刚新增的货主）时后台重拉该类数据，同类 30 秒内最多一次
 * - 标签页重新可见时，超过 5 分钟未加载的数据后台刷新
 */
export const useRefDataStore = defineStore('refData', () => {
  const data = reactive({ owners: [], warehouses: [], areas: [], locations: [], materials: [] })
  const pending = {}
  const loadedAt = {}
  const lastMissRefresh = {}

  /** 加载指定参考数据，已加载过的直接复用；单项失败不影响其他项 */
  const ensure = (keys, { force = false } = {}) =>
    Promise.allSettled(
      keys.map((key) => {
        if (force || !pending[key]) {
          pending[key] = LOADERS[key]()
            .then((list) => {
              data[key] = list || []
              loadedAt[key] = Date.now()
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

  /** 名称查不到时后台重拉（只针对本会话已加载过的数据；节流） */
  const refreshOnMiss = (key) => {
    if (!loadedAt[key]) return
    const now = Date.now()
    if (now - (lastMissRefresh[key] || 0) < MISS_REFRESH_INTERVAL) return
    lastMissRefresh[key] = now
    // 渲染期间被调用，推迟到微任务再发请求，避免在渲染中修改响应式数据
    queueMicrotask(() => ensure([key], { force: true }))
  }

  /** 后台刷新超过 STALE_AFTER 未加载的数据（标签页重新可见时调用） */
  const refreshStale = () => {
    const now = Date.now()
    const stale = Object.keys(loadedAt).filter((key) => now - loadedAt[key] > STALE_AFTER)
    if (stale.length) ensure(stale, { force: true })
    return stale
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshStale()
    })
  }

  const reset = () => {
    invalidate(...Object.keys(LOADERS))
    Object.keys(loadedAt).forEach((key) => delete loadedAt[key])
    Object.keys(data).forEach((key) => {
      data[key] = []
    })
  }

  const ownerMap = computed(() => toMap(data.owners, 'ownerName'))
  const warehouseMap = computed(() => toMap(data.warehouses, 'warehouseName'))
  const areaMap = computed(() => toMap(data.areas, 'areaName'))
  const locationMap = computed(() => toMap(data.locations, 'locationCode'))
  // 查不到时触发后台重拉，加载完成后名称自动更新
  const lookup = (map, key, id, fallback) => {
    if (id == null || id === '') return '-'
    const name = map.value[id]
    if (name) return name
    refreshOnMiss(key)
    return fallback
  }
  const ownerName = (id) => lookup(ownerMap, 'owners', id, '-')
  const warehouseName = (id) => lookup(warehouseMap, 'warehouses', id, '-')
  const areaName = (id) => lookup(areaMap, 'areas', id, '-')
  // 库位不在缓存中（如已删除）时显示 #id，便于排查
  const locationCode = (id) => lookup(locationMap, 'locations', id, `#${id}`)

  return {
    ...toRefs(data),
    ensure,
    invalidate,
    reset,
    refreshStale,
    ownerName,
    warehouseName,
    areaName,
    locationCode
  }
})
