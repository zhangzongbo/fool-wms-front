import { ref, computed, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 解析 WS 地址：完整地址原样使用；以 / 开头的相对路径按当前页面协议与域名拼接（https 页面使用 wss://）
 * @param {string} url
 */
export const resolveWsUrl = (url, loc = window.location) => {
  if (!url.startsWith('/')) return url
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${loc.host}${url}`
}

// WS 地址：优先读取环境变量，回退到本地 agent 服务
const WS_URL = resolveWsUrl(import.meta.env.VITE_AGENT_WS_URL || 'ws://localhost:9996/ws/api/scm/agent/qa')

export const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 将服务端帧解析为统一结构：{ kind, text, eventType, name }
// 帧格式约定：{"type":"message"|"heartbeat"|"done"|...,"data":"..."}
export const parseFrame = (raw) => {
  if (typeof raw !== 'string') {
    return { kind: 'ignore' }
  }
  const text = raw.trim()
  if (!text) {
    return { kind: 'ignore' }
  }
  // 结束标记需在 JSON 分支前判断：'[DONE]' 以 '[' 开头，否则会被当作 JSON 解析失败而显示为正文
  if (text === '[DONE]' || text === '<END>') {
    return { kind: 'done' }
  }
  if (text[0] !== '{' && text[0] !== '[') {
    return { kind: 'message', text: raw }
  }

  let obj
  try {
    obj = JSON.parse(text)
  } catch (e) {
    return { kind: 'message', text: raw }
  }

  const type = String(obj.type ?? obj.event ?? '').toLowerCase()
  const rawData = obj.data ?? obj.content ?? obj.delta ?? obj.text ?? obj.message ?? obj.chunk ?? ''
  const dataStr = typeof rawData === 'string' ? rawData : JSON.stringify(rawData)
  const name = obj.name || obj.tool || obj.toolName || obj.action || ''

  if (type === 'heartbeat' || type === 'ping') {
    return { kind: 'ignore' }
  }
  if (type === 'session' || type === 'session_id' || type === 'sessionid') {
    return { kind: 'session', text: dataStr }
  }
  if (
    type === 'done' || type === 'end' || type === 'finish' || type === 'complete' ||
    obj.done === true || obj.finished === true || obj.end === true
  ) {
    return { kind: 'done' }
  }
  if (type === 'error') {
    return { kind: 'error', text: dataStr || obj.msg || obj.message || '服务异常' }
  }
  const errByCode = obj.code && obj.code !== 200 && obj.code !== 0 ? obj.msg || obj.message : ''
  if (errByCode) {
    return { kind: 'error', text: String(errByCode) }
  }
  if (type === 'thought' || type === 'reasoning' || type === 'thinking') {
    return { kind: 'thought', text: dataStr }
  }
  if (type === '' || type === 'message' || type === 'text' || type === 'content' || type === 'answer') {
    return { kind: 'message', text: dataStr }
  }
  // 其余类型统一视为工具 / 状态事件
  return { kind: 'event', eventType: type, name, text: dataStr }
}

/**
 * agent 对话的 WebSocket 生命周期与流式回复管理
 * @param {Object} options
 * @param {import('vue').Ref<Array>} options.messages 消息列表
 * @param {import('vue').Ref<string>} options.userId 用户 id
 * @param {import('vue').Ref<boolean>} options.returnThought 是否返回思考过程
 * @param {import('vue').Ref<string>} options.authToken 可选 auth token
 * @param {Function} [options.onUpdate] 消息有变化时回调（页面用于滚动到底部）
 */
export function useAgentSocket({ messages, userId, returnThought, authToken, onUpdate = () => {} }) {
  // 会话 id：首轮不传，由服务端自动分配（纯数字），后续轮次复用
  const sessionId = ref('')
  // 连接状态：idle / connecting / streaming / error
  const connState = ref('idle')
  const isStreaming = computed(() => connState.value === 'connecting' || connState.value === 'streaming')

  let ws = null
  let currentReply = null

  // 工具 / 状态事件：逐条追加展示（后端每次 tool 调用含具体参数，各自独立一条）
  const pushEvent = (frame) => {
    if (!currentReply) {
      return
    }
    // 仅跳过完全重复的连续帧，避免同一帧重发造成的刷屏
    const last = currentReply.events[currentReply.events.length - 1]
    if (last && last.type === frame.eventType && last.name === frame.name && last.text === frame.text) {
      return
    }
    markEventsDone()
    currentReply.events.push({
      id: genId(),
      type: frame.eventType,
      name: frame.name,
      text: frame.text,
      running: true
    })
  }

  const markEventsDone = () => {
    if (!currentReply) {
      return
    }
    currentReply.events.forEach((ev) => {
      ev.running = false
    })
  }

  const closeWs = () => {
    if (ws) {
      try {
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        ws.close()
      } catch (e) {
        // 忽略关闭异常
      }
      ws = null
    }
  }

  const stopStreaming = () => {
    closeWs()
    if (currentReply) {
      markEventsDone()
      currentReply.streaming = false
      if (!currentReply.content && !currentReply.thought) {
        currentReply.error = '已停止'
      }
    }
    currentReply = null
    connState.value = 'idle'
  }

  // 新会话：中断当前回复并清空消息与会话 id
  const resetSession = () => {
    if (isStreaming.value) {
      stopStreaming()
    }
    closeWs()
    messages.value = []
    sessionId.value = ''
    connState.value = 'idle'
  }

  const finishStream = () => {
    if (currentReply) {
      markEventsDone()
      currentReply.streaming = false
      if (!currentReply.content && !currentReply.thought && !currentReply.error && !currentReply.events.length) {
        currentReply.error = '未收到回复内容'
      }
    }
    currentReply = null
    closeWs()
    connState.value = 'idle'
    onUpdate()
  }

  const finishWithError = (message) => {
    connState.value = 'error'
    if (currentReply) {
      markEventsDone()
      currentReply.streaming = false
      if (!currentReply.content) {
        currentReply.error = message
      }
    }
    currentReply = null
    closeWs()
    ElMessage.error(message)
    onUpdate()
  }

  const openAndSend = (prompt) => {
    connState.value = 'connecting'
    closeWs()

    try {
      ws = new WebSocket(WS_URL)
    } catch (e) {
      finishWithError('无法建立连接')
      return
    }

    const payload = {
      prompt,
      userId: userId.value,
      returnThought: returnThought.value
    }
    // 仅当填写了 auth token 时才携带（可为空）
    if (authToken.value.trim()) {
      payload.token = authToken.value.trim()
    }
    // 仅当已有服务端分配的会话 id 时才传递（首轮由服务端自动分配）
    if (sessionId.value) {
      payload.sessionId = sessionId.value
    }

    ws.onopen = () => {
      connState.value = 'streaming'
      try {
        ws.send(JSON.stringify(payload))
      } catch (e) {
        finishWithError('发送失败')
      }
    }

    ws.onmessage = (evt) => {
      if (!currentReply) {
        return
      }
      const frame = parseFrame(evt.data)
      switch (frame.kind) {
        case 'ignore':
          return
        case 'session':
          // 服务端首轮分配的会话 id，后续轮次需携带
          if (frame.text) {
            sessionId.value = frame.text
          }
          return
        case 'error':
          finishWithError(frame.text)
          return
        case 'done':
          finishStream()
          return
        case 'thought':
          currentReply.thought += frame.text
          break
        case 'message':
          // 收到正文后，把仍在运行中的工具事件标记为完成
          markEventsDone()
          currentReply.content += frame.text
          break
        case 'event':
          pushEvent(frame)
          break
        default:
          break
      }
      connState.value = 'streaming'
      onUpdate()
    }

    ws.onerror = () => {
      finishWithError('连接异常，请检查 agent 服务是否已启动')
    }

    ws.onclose = () => {
      // 服务端主动关闭视为回复结束
      if (currentReply && currentReply.streaming) {
        finishStream()
      }
    }
  }

  // 追加用户消息与空的助手回复，然后建立连接发送
  const sendPrompt = (prompt) => {
    if (!prompt || isStreaming.value) {
      return
    }

    messages.value.push({
      id: genId(),
      role: 'user',
      content: prompt,
      time: nowTime()
    })

    const reply = {
      id: genId(),
      role: 'assistant',
      content: '',
      thought: '',
      thoughtOpen: true,
      events: [],
      streaming: true,
      error: '',
      time: nowTime()
    }
    messages.value.push(reply)
    // 关键：改用响应式代理引用，逐帧修改才能触发流式渲染
    currentReply = messages.value[messages.value.length - 1]
    onUpdate()

    openAndSend(prompt)
  }

  onBeforeUnmount(() => {
    closeWs()
  })

  return {
    sessionId,
    connState,
    isStreaming,
    sendPrompt,
    stopStreaming,
    resetSession
  }
}
