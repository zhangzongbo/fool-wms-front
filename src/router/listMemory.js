// 列表页最近一次的查询条件（按路径记忆）：从详情 / 编辑页经面包屑返回列表时带回原筛选
// 列表页由 useServerList 写入；仅存于内存，刷新页面后以 URL 为准
const memory = new Map()

export const rememberListQuery = (path, query) => memory.set(path, { ...query })

/** 返回列表页的路由位置：有记忆时带上原筛选 */
export const listLocation = (path) => {
  const query = memory.get(path)
  return query && Object.keys(query).length ? { path, query } : path
}
