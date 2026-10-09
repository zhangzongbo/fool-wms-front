import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/user'

/** 存储键：按「用户 + 页面 + 版本」隔离；列定义变化时页面把 version 加 1，旧数据自动失效 */
export const columnsStorageKey = (userId, tableKey, version) => `wms:cols:${userId ?? 'anon'}:${tableKey}:v${version}`

/**
 * 表格列设置（spec 四期 U10）：显示 / 隐藏与列宽，按用户与页面记在浏览器本地
 * - 列模板仍写在页面里，只给可配置的 <el-table-column> 加
 *   column-key="key"、v-if="cols.visible('key')"、:width="cols.width('key', 默认宽)"；表格 @header-dragend="cols.onDragEnd"
 * - fixed 列（序号、单号 / 编码、状态、操作）不可隐藏，但列宽同样可拖动并记住
 * - 存储中不认识的列 key、非法宽度一律忽略；localStorage 不可用（隐私模式等）时静默退化为仅本次有效
 *
 * @param {string} tableKey 如 'inbound'
 * @param {Array<{ key: string, label: string, fixed?: boolean }>} columns 可配置的列
 * @param {{ version?: number }} [options]
 * @returns {{ visible(key): boolean, width(key, fallback): number|undefined, onDragEnd(newWidth, oldWidth, column): void,
 *             settings: import('vue').Ref<Array<{ key, label, fixed, visible }>>, toggle(key): void, reset(): void }}
 */
export function useTableColumns(tableKey, columns, { version = 1 } = {}) {
  const userStore = useUserStore()
  const defs = new Map(columns.map((c) => [c.key, c]))
  const hideable = (key) => defs.has(key) && !defs.get(key).fixed

  const storageKey = computed(() => columnsStorageKey(userStore.userInfo?.userId, tableKey, version))
  const hidden = ref([]) // 被隐藏的列 key
  const widths = ref({}) // key -> 拖动后的列宽（px）

  const load = () => {
    let saved = null
    try {
      saved = JSON.parse(localStorage.getItem(storageKey.value) || 'null')
    } catch (e) {
      saved = null
    }
    const h = Array.isArray(saved?.hidden) ? saved.hidden : []
    hidden.value = [...new Set(h.filter(hideable))]
    const w = saved?.widths && typeof saved.widths === 'object' ? saved.widths : {}
    widths.value = Object.fromEntries(
      Object.entries(w).filter(([key, val]) => defs.has(key) && Number.isFinite(val) && val > 0)
    )
  }

  const save = () => {
    try {
      localStorage.setItem(storageKey.value, JSON.stringify({ hidden: hidden.value, widths: widths.value }))
    } catch (e) {
      // 存储不可用或已满：只影响记忆，不影响本次使用
    }
  }

  load()
  // 换账号后（同一组件实例未重建时）按新用户重新读取
  watch(storageKey, load)

  const visible = (key) => !hidden.value.includes(key)
  const width = (key, fallback) => widths.value[key] ?? fallback

  // Element Plus header-dragend：(newWidth, oldWidth, column, event)，列以 column-key 识别
  const onDragEnd = (newWidth, oldWidth, column) => {
    const key = column?.columnKey
    if (!defs.has(key) || !Number.isFinite(newWidth) || newWidth <= 0) return
    widths.value = { ...widths.value, [key]: Math.round(newWidth) }
    save()
  }

  const toggle = (key) => {
    if (!hideable(key)) return
    hidden.value = visible(key) ? [...hidden.value, key] : hidden.value.filter((k) => k !== key)
    save()
  }

  const reset = () => {
    hidden.value = []
    widths.value = {}
    try {
      localStorage.removeItem(storageKey.value)
    } catch (e) {
      // 同 save
    }
  }

  // 列设置面板的数据源
  const settings = computed(() =>
    columns.map((c) => ({ key: c.key, label: c.label, fixed: !!c.fixed, visible: visible(c.key) }))
  )

  return { visible, width, onDragEnd, settings, toggle, reset }
}
