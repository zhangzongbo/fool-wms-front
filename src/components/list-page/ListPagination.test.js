import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElPagination } from 'element-plus'
import ListPagination from './ListPagination.vue'

const setup = () =>
  mount(ListPagination, {
    props: { total: 95, current: 3, size: 10 },
    global: { components: { ElPagination } }
  })

describe('ListPagination', () => {
  it('统一 background 与每页条数选项', () => {
    const p = setup().findComponent(ElPagination)
    expect(p.props('background')).toBe(true)
    expect(p.props('pageSizes')).toEqual([10, 20, 50, 100])
    expect(p.props('currentPage')).toBe(3)
  })

  it('翻页时更新 current 并触发 change', () => {
    const w = setup()
    w.findComponent(ElPagination).vm.$emit('current-change', 5)
    expect(w.emitted('update:current')).toEqual([[5]])
    expect(w.emitted('change')).toHaveLength(1)
  })

  it('修改每页条数时回到第 1 页', () => {
    const w = setup()
    w.findComponent(ElPagination).vm.$emit('size-change', 20)
    expect(w.emitted('update:size')).toEqual([[20]])
    expect(w.emitted('update:current')).toEqual([[1]])
    expect(w.emitted('change')).toHaveLength(1)
  })
})
