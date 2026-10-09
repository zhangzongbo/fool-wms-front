import { describe, it, expect } from 'vitest'
import { resolveBreadcrumb } from './breadcrumb'

describe('resolveBreadcrumb', () => {
  it('有分组时显示「首页 / 分组 / 当前页」，分组不可点击', () => {
    expect(resolveBreadcrumb({ path: '/inbound', meta: { title: '入库管理', group: '仓储作业' } })).toEqual([
      { title: '首页', to: '/dashboard' },
      { title: '仓储作业' },
      { title: '入库管理' }
    ])
  })

  it('无分组时显示「首页 / 当前页」', () => {
    expect(resolveBreadcrumb({ path: '/inventory', meta: { title: '库存查询' } })).toEqual([
      { title: '首页', to: '/dashboard' },
      { title: '库存查询' }
    ])
  })

  it('仪表盘只显示「首页」且不可点击', () => {
    expect(resolveBreadcrumb({ path: '/dashboard', meta: { title: '仪表盘' } })).toEqual([{ title: '首页' }])
  })

  it('隐藏页插入可点击的父级列表，并可带回原筛选', () => {
    const route = {
      path: '/inbound/12',
      meta: { title: '入库单详情', group: '仓储作业', parent: { title: '入库管理', path: '/inbound' } }
    }
    expect(resolveBreadcrumb(route)).toEqual([
      { title: '首页', to: '/dashboard' },
      { title: '仓储作业' },
      { title: '入库管理', to: '/inbound' },
      { title: '入库单详情' }
    ])
    const toList = (path) => ({ path, query: { status: 'DRAFT' } })
    expect(resolveBreadcrumb(route, toList)[2]).toEqual({
      title: '入库管理',
      to: { path: '/inbound', query: { status: 'DRAFT' } }
    })
  })
})
