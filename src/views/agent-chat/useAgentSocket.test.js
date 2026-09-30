import { describe, it, expect } from 'vitest'
import { parseFrame, resolveWsUrl } from './useAgentSocket'

describe('parseFrame', () => {
  it('结束标记：[DONE] / <END> / type=done', () => {
    expect(parseFrame('[DONE]')).toEqual({ kind: 'done' })
    expect(parseFrame(' <END> ')).toEqual({ kind: 'done' })
    expect(parseFrame('{"type":"done"}')).toEqual({ kind: 'done' })
  })

  it('正文、会话、错误、心跳帧', () => {
    expect(parseFrame('{"type":"message","data":"你好"}')).toMatchObject({ kind: 'message', text: '你好' })
    expect(parseFrame('{"type":"session","data":"123"}')).toEqual({ kind: 'session', text: '123' })
    expect(parseFrame('{"type":"error","data":"登录态无效"}')).toMatchObject({ kind: 'error', text: '登录态无效' })
    expect(parseFrame('{"type":"heartbeat"}')).toEqual({ kind: 'ignore' })
  })

  it('非 JSON 文本当作正文，空帧忽略', () => {
    expect(parseFrame('plain text')).toEqual({ kind: 'message', text: 'plain text' })
    expect(parseFrame('   ')).toEqual({ kind: 'ignore' })
    expect(parseFrame(null)).toEqual({ kind: 'ignore' })
  })
})

describe('resolveWsUrl', () => {
  it('完整地址原样返回', () => {
    expect(resolveWsUrl('ws://localhost:9996/ws/qa')).toBe('ws://localhost:9996/ws/qa')
  })

  it('相对路径按页面协议拼接', () => {
    expect(resolveWsUrl('/ws/qa', { protocol: 'https:', host: 'wms.example.com' })).toBe('wss://wms.example.com/ws/qa')
    expect(resolveWsUrl('/ws/qa', { protocol: 'http:', host: 'localhost:5174' })).toBe('ws://localhost:5174/ws/qa')
  })
})
