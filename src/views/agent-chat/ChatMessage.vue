<template>
  <div class="msg-row" :class="msg.role">
    <div class="msg-avatar" :class="msg.role">
      {{ msg.role === 'user' ? userInitial : 'AI' }}
    </div>
    <div class="msg-main">
      <!-- 思考过程（可折叠） -->
      <div v-if="msg.thought" class="msg-thought">
        <div class="thought-head" @click="emit('toggle-thought')">
          <el-icon><MagicStick /></el-icon>
          <span>思考过程</span>
          <el-icon class="thought-arrow" :class="{ open: msg.thoughtOpen }"><ArrowRight /></el-icon>
        </div>
        <div v-show="msg.thoughtOpen" class="thought-body">{{ msg.thought }}</div>
      </div>

      <!-- 工具 / 状态事件 -->
      <div v-if="msg.events && msg.events.length" class="msg-events">
        <div v-for="ev in msg.events" :key="ev.id" class="event-item" :class="{ running: ev.running }">
          <span class="event-icon">{{ eventIcon(ev.type) }}</span>
          <span class="event-label" :title="eventLabel(ev)">{{ eventLabel(ev) }}</span>
          <el-icon v-if="ev.running" class="event-spin"><Loading /></el-icon>
        </div>
      </div>

      <div v-if="!(msg.streaming && msg.events && msg.events.length && !msg.content && !msg.error)" class="msg-bubble" :class="msg.role">
        <template v-if="msg.content">
          <ChatMarkdown v-if="msg.role === 'assistant'" :content="msg.content" :streaming="msg.streaming" />
          <template v-else>{{ msg.content }}</template>
        </template>
        <span v-if="msg.streaming" class="cursor">▍</span>
        <span v-if="!msg.content && msg.streaming && !msg.thought && !(msg.events && msg.events.length)" class="typing">
          <i></i><i></i><i></i>
        </span>
        <span v-if="msg.error" class="msg-error">{{ msg.error }}</span>
      </div>
      <div class="msg-time">{{ msg.time }}</div>
    </div>
  </div>
</template>

<script setup>
import { MagicStick, ArrowRight, Loading } from '@element-plus/icons-vue'
import ChatMarkdown from './ChatMarkdown.vue'
import { eventIcon, eventLabel } from './chatEvents'

defineProps({
  msg: { type: Object, required: true },
  userInitial: { type: String, default: 'U' }
})

// 折叠状态由持有消息列表的页面修改，组件内不直接改 prop
const emit = defineEmits(['toggle-thought'])
</script>

<style scoped>
.msg-row {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}
.msg-row.user {
  flex-direction: row-reverse;
}
.msg-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}
.msg-avatar.assistant {
  background: linear-gradient(135deg, #1765ad 0%, #4a90e2 100%);
}
.msg-avatar.user {
  background: linear-gradient(135deg, #34a853 0%, #66bb6a 100%);
}
.msg-main {
  max-width: 88%;
  display: flex;
  flex-direction: column;
}
/* 助手回复放宽到接近整行，便于展示表格 / 代码等横向内容 */
.msg-row.assistant .msg-main {
  max-width: calc(100% - 46px);
}
.msg-row.user .msg-main {
  align-items: flex-end;
}

.msg-thought {
  margin-bottom: 8px;
  background: #f0f4fa;
  border: 1px solid #dce6f2;
  border-radius: 10px;
  overflow: hidden;
}
.thought-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12px;
  color: #5a7599;
  cursor: pointer;
  user-select: none;
}
.thought-arrow {
  margin-left: auto;
  transition: transform 0.2s;
}
.thought-arrow.open {
  transform: rotate(90deg);
}
.thought-body {
  padding: 0 12px 10px;
  font-size: 12.5px;
  color: #7089a8;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 工具 / 状态事件 */
.msg-events {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
.event-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  background: #f4f7fb;
  border: 1px solid #e6ecf5;
  border-radius: 8px;
  font-size: 12.5px;
  color: #5a7599;
  max-width: 100%;
}
.event-item.running {
  background: #eef4ff;
  border-color: #cfe0fb;
  color: #2f6fd1;
}
.event-icon {
  font-size: 13px;
  line-height: 1;
}
.event-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.event-spin {
  margin-left: auto;
  animation: spin 0.9s linear infinite;
}

.msg-bubble {
  padding: 11px 15px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1f2d3d;
}
.msg-bubble.assistant {
  background: #fff;
  border: 1px solid #eef1f6;
  border-top-left-radius: 4px;
}
.msg-bubble.user {
  background: linear-gradient(135deg, #1765ad 0%, #2f7fd1 100%);
  color: #fff;
  border-top-right-radius: 4px;
}
.msg-time {
  margin-top: 5px;
  font-size: 11px;
  color: #c0c4cc;
}
.msg-error {
  color: #f56c6c;
}

/* Markdown 渲染样式：ChatMarkdown 根节点会继承本组件的 scope id，故写在这里；内部 v-html 元素需 :deep */
.markdown-body {
  font-size: 14px;
  line-height: 1.75;
  color: #1f2d3d;
  word-break: break-word;
}
.markdown-body :deep(p) {
  margin: 0 0 10px;
}
.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 16px 0 8px;
  font-weight: 600;
  line-height: 1.4;
}
.markdown-body :deep(h1) { font-size: 20px; }
.markdown-body :deep(h2) { font-size: 18px; }
.markdown-body :deep(h3) { font-size: 16px; }
.markdown-body :deep(h4) { font-size: 14px; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 6px 0 10px;
  padding-left: 22px;
}
.markdown-body :deep(li) {
  margin: 3px 0;
}
.markdown-body :deep(a) {
  color: #1765ad;
  text-decoration: none;
}
.markdown-body :deep(a:hover) {
  text-decoration: underline;
}
.markdown-body :deep(code) {
  padding: 2px 6px;
  background: #f2f4f8;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12.5px;
  color: #c7254e;
}
.markdown-body :deep(pre) {
  margin: 8px 0;
  padding: 12px 14px;
  background: #1e2733;
  border-radius: 8px;
  overflow-x: auto;
}
.markdown-body :deep(pre code) {
  padding: 0;
  background: transparent;
  color: #e6edf3;
  font-size: 12.5px;
  line-height: 1.6;
}
/* mermaid 占位源码块：浅色底，与普通代码块区分 */
.markdown-body :deep(pre.mermaid-block) {
  background: #f7f9fc;
  border: 1px dashed #cfd8e6;
  color: #6b7a90;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12.5px;
  line-height: 1.6;
}
/* mermaid 渲染失败：在源码块顶部提示原因 */
.markdown-body :deep(pre.mermaid-block[data-error]::before) {
  content: attr(data-error);
  display: block;
  margin-bottom: 6px;
  color: #e6a23c;
  font-size: 12px;
}
/* mermaid 渲染后的图表容器 */
.markdown-body :deep(.mermaid-chart) {
  margin: 8px 0;
  padding: 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow-x: auto;
  text-align: center;
}
.markdown-body :deep(.mermaid-chart svg) {
  max-width: 100%;
  height: auto;
}
.markdown-body :deep(blockquote) {
  margin: 8px 0;
  padding: 4px 14px;
  border-left: 3px solid #cfd8e6;
  color: #6b7a90;
  background: #f7f9fc;
  border-radius: 0 6px 6px 0;
}
.markdown-body :deep(table) {
  margin: 10px 0;
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e4e7ed;
  padding: 6px 10px;
  text-align: left;
}
.markdown-body :deep(th) {
  background: #f4f7fb;
  font-weight: 600;
}
.markdown-body :deep(hr) {
  margin: 14px 0;
  border: none;
  border-top: 1px solid #eef1f6;
}
.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}
.markdown-body :deep(> :first-child) {
  margin-top: 0;
}

.cursor {
  display: inline-block;
  margin-left: 1px;
  color: #1765ad;
  animation: blink 1s step-end infinite;
}
.typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}
.typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c0c4cc;
  animation: bounce 1.2s infinite ease-in-out;
}
.typing i:nth-child(2) { animation-delay: 0.15s; }
.typing i:nth-child(3) { animation-delay: 0.3s; }

/* scoped 下 keyframes 名会加 scope 后缀，需与使用它的规则放在同一组件 */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-5px); opacity: 1; }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
