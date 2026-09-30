import { describe, it, expect } from 'vitest'
import { ref, reactive, computed, nextTick } from 'vue'
import { useLocalPage } from './useLocalPage'

const setup = (total = 35) => {
  const raw = ref(Array.from({ length: total }, (_, i) => ({ id: i + 1, name: `item${i + 1}` })))
  const search = reactive({ keyword: '' })
  const filtered = computed(() => raw.value.filter((r) => r.name.includes(search.keyword)))
  return { raw, search, ...useLocalPage(filtered, search) }
}

describe('useLocalPage', () => {
  it('按页切片', () => {
    const { page, pagedList } = setup()
    page.current = 3
    expect(pagedList.value.map((r) => r.id)).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30])
  })

  it('搜索条件变化时回到第 1 页', async () => {
    const { page, search } = setup()
    page.current = 3
    search.keyword = 'item1'
    await nextTick()
    expect(page.current).toBe(1)
  })

  it('列表变短导致页码越界时收敛到最后一页', async () => {
    const { page, raw, pagedList } = setup()
    page.current = 4
    raw.value = raw.value.slice(0, 30)
    await nextTick()
    expect(page.current).toBe(3)
    expect(pagedList.value).toHaveLength(10)
  })

  it('列表清空时停在第 1 页', async () => {
    const { page, raw } = setup()
    page.current = 2
    raw.value = []
    await nextTick()
    expect(page.current).toBe(1)
  })
})
