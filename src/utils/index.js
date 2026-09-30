/**
 * 取 Promise.allSettled 单项结果：成功返回数据（空值兜底为 []），失败返回 fallback
 * 用于并行加载多个列表时，单个接口失败不影响其他数据（失败提示已由请求拦截器统一弹出）
 * @param {PromiseSettledResult} result
 * @param {*} fallback 失败时的返回值，通常传入当前值以保留旧数据
 */
export const settledValue = (result, fallback) => (result.status === 'fulfilled' ? result.value || [] : fallback)
