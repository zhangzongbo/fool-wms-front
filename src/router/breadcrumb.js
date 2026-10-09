/**
 * 顶栏面包屑：首页 /（菜单分组）/ 当前页
 * - 分组取自路由 meta.group，只是归类，不可点击
 * - 仪表盘即首页，只显示「首页」
 * @param {{ path: string, meta?: { title?: string, group?: string } }} route
 * @returns {Array<{ title: string, to?: string }>}
 */
export function resolveBreadcrumb(route) {
  const home = { title: '首页', to: '/dashboard' }
  const { title, group } = route.meta || {}
  if (route.path === '/dashboard' || !title) {
    return [{ title: home.title }]
  }
  return [home, ...(group ? [{ title: group }] : []), { title }]
}
