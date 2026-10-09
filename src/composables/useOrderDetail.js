import { ref, reactive } from 'vue'

/**
 * 单据明细抽屉：打开抽屉、加载明细、单据变更后刷新单头
 * @param {(orderId) => Promise<Array>} listDetails 按单据 id 查询明细
 * @param {(orderId) => Promise<object>} getOrder 按 id 查询单头（列表已分页，当前单据不一定在本页，不能从列表里找）
 */
export function useOrderDetail(listDetails, getOrder) {
  const detail = reactive({ visible: false, loading: false, order: null })
  const detailList = ref([])

  const reloadDetail = async () => {
    const orderId = detail.order?.id
    if (orderId == null) return
    detail.loading = true
    try {
      const list = (await listDetails(orderId)) || []
      // 切换单据后丢弃过期响应
      if (detail.order?.id === orderId) detailList.value = list
    } catch (e) {
      // 错误提示已由请求拦截器处理
    } finally {
      detail.loading = false
    }
  }
  const openDetail = (row) => {
    detail.order = row
    detailList.value = []
    detail.visible = true
    reloadDetail()
  }
  // 单据或明细变更后调用：抽屉打开时重新获取单头并重新加载明细（状态流转、分配、过账等操作都会改动它们）
  // 单头只取后端返回的字段合并，保留列表行上的汇总字段（如 itemCount），避免抽屉里闪烁
  const syncDetail = async () => {
    if (!detail.visible || !detail.order) return
    const orderId = detail.order.id
    try {
      const fresh = await getOrder(orderId)
      if (fresh && detail.order?.id === orderId) detail.order = { ...detail.order, ...fresh }
    } catch (e) {
      // 错误提示已由请求拦截器处理，保留原单头
    }
    reloadDetail()
  }

  return { detail, detailList, reloadDetail, openDetail, syncDetail }
}
