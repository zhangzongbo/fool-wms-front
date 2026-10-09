/**
 * 顶栏面包屑：首页 /（菜单分组）/（父级列表）/ 当前页
 * - 分组取自路由 meta.group，只是归类，不可点击
 * - 详情 / 编辑等隐藏页用 meta.parent = { title, path } 指向所属列表，父级可点击并带回原筛选
 * - 仪表盘即首页，只显示「首页」
 * @param {{ path: string, meta?: { title?: string, group?: string, parent?: { title: string, path: string } } }} route
 * @param {(path: string) => string|object} [toList] 父级列表的跳转位置（默认即路径，可传入带筛选的位置）
 * @returns {Array<{ title: string, to?: string|object }>}
 */
export function resolveBreadcrumb(route, toList = (path) => path) {
  const home = { title: '首页', to: '/dashboard' }
  const { title, group, parent } = route.meta || {}
  if (route.path === '/dashboard' || !title) {
    return [{ title: home.title }]
  }
  return [
    home,
    ...(group ? [{ title: group }] : []),
    ...(parent ? [{ title: parent.title, to: toList(parent.path) }] : []),
    { title }
  ]
}
