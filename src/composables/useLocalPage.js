import { reactive, computed, watch } from 'vue'

/**
 * 前端分页：对已过滤的列表做切片
 * - 搜索条件变化时回到第 1 页，避免停在第 N 页输入关键字后表格变空
 * - 列表变短（如删除末页最后一条）导致页码越界时，收敛到最后一页
 * @param {import('vue').Ref<Array>} list 已过滤的列表
 * @param {object} search 搜索条件（reactive），变化即重置页码
 */
export function useLocalPage(list, search) {
  const page = reactive({ current: 1, size: 10 })
  const pagedList = computed(() => list.value.slice((page.current - 1) * page.size, page.current * page.size))

  if (search) {
    watch(
      search,
      () => {
        page.current = 1
      },
      { deep: true }
    )
  }
  watch(
    () => list.value.length,
    (len) => {
      const maxPage = Math.max(1, Math.ceil(len / page.size))
      if (page.current > maxPage) page.current = maxPage
    }
  )

  return { page, pagedList }
}
