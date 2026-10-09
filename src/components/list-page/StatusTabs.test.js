import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ElTabs, ElTabPane } from 'element-plus'
import StatusTabs from './StatusTabs.vue'

const OPTIONS = { DRAFT: { label: '草稿' }, FINISHED: { label: '已完成' } }
const setup = (props = {}) =>
  mount(StatusTabs, {
    props: { options: OPTIONS, counts: { DRAFT: 2, FINISHED: 5 }, ...props },
    global: { components: { ElTabs, ElTabPane } }
  })

describe('StatusTabs', () => {
  it('「全部」数量为各状态之和', () => {
    expect(setup().text()).toContain('全部7')
  })

  it('切到「全部」时值为空串，切到状态时为状态值', () => {
    const w = setup({ modelValue: 'DRAFT' })
    const tabs = w.findComponent(ElTabs)
    tabs.vm.$emit('tab-change', '__ALL__')
    tabs.vm.$emit('tab-change', 'FINISHED')
    expect(w.emitted('update:modelValue')).toEqual([[''], ['FINISHED']])
    expect(w.emitted('change')).toEqual([[''], ['FINISHED']])
  })
})
