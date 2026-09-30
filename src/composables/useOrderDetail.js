import { ref, reactive } from 'vue'

/**
 * 单据明细抽屉：打开抽屉、加载明细、列表刷新后同步单头
 * @param {(orderId) => Promise<Array>} listDetails 按单据 id 查询明细
 */
export function useOrderDetail(listDetails) {
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
  // 列表刷新后调用：抽屉打开时替换为最新单头并重新加载明细（状态流转、分配、过账等操作都会改动它们）
  const syncDetail = (orders) => {
    if (!detail.visible || !detail.order) return
    detail.order = orders.find((o) => o.id === detail.order.id) || detail.order
    reloadDetail()
  }

  return { detail, detailList, reloadDetail, openDetail, syncDetail }
}
