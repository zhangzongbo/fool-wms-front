// 工具 / 状态事件的图标与文案字典
export const EVENT_ICONS = {
  tool: '🔧',
  tool_call: '🔧',
  tool_use: '🔧',
  function_call: '🔧',
  tool_result: '✅',
  tool_response: '✅',
  observation: '✅',
  read: '📖',
  read_file: '📖',
  file: '📖',
  search: '🔍',
  grep: '🔍',
  action: '⚡',
  step: '⚙️',
  status: '⚙️',
  plan: '📝',
  progress: '⏳'
}

export const EVENT_TEXTS = {
  tool: '调用工具',
  tool_call: '调用工具',
  tool_use: '调用工具',
  function_call: '调用工具',
  tool_result: '工具返回',
  tool_response: '工具返回',
  observation: '工具返回',
  read: '读取文件',
  read_file: '读取文件',
  search: '检索代码',
  grep: '检索代码',
  action: '执行动作',
  step: '执行步骤',
  status: '状态',
  plan: '规划',
  progress: '进行中'
}

export const eventIcon = (type) => EVENT_ICONS[type] || '🛠️'

export const eventLabel = (ev) => {
  const base = EVENT_TEXTS[ev.type] || ev.type || '事件'
  // 同时展示工具名与参数详情（后端 tool 帧现携带具体参数）
  const parts = []
  if (ev.name) {
    parts.push(ev.name)
  }
  if (ev.text && ev.text !== ev.name) {
    parts.push(ev.text)
  }
  const detail = parts.join(' ')
  return detail ? `${base}：${detail}` : base
}
