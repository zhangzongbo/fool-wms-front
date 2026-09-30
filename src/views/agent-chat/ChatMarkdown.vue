<template>
  <!-- eslint-disable-next-line vue/no-v-html -- html 由 renderMarkdown 生成：禁用原始 HTML 且经 DOMPurify 清洗 -->
  <div ref="rootRef" class="markdown-body" v-html="html"></div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { renderMarkdown, renderMermaidBlocks } from '@/utils/markdown'

const props = defineProps({
  content: { type: String, default: '' },
  streaming: { type: Boolean, default: false }
})

// 流式期间节流刷新，避免每一帧都重跑 markdown-it + DOMPurify
const THROTTLE_MS = 80
const rootRef = ref(null)
const shown = ref(props.content)
let timer = null

const flush = () => {
  clearTimeout(timer)
  timer = null
  shown.value = props.content
}

watch(
  () => props.content,
  () => {
    if (!props.streaming) {
      flush()
    } else if (!timer) {
      timer = setTimeout(flush, THROTTLE_MS)
    }
  }
)

// html 按消息缓存：其他消息更新时不会重算；内容不变时 v-html 也不会重置 DOM，已渲染的 mermaid 图得以保留
const html = computed(() => renderMarkdown(shown.value))

// mermaid 只在内容定稿后渲染一次：流式期间 v-html 每次刷新都会冲掉已渲染的 SVG
const renderMermaid = () => nextTick(() => renderMermaidBlocks(rootRef.value))

watch(
  () => props.streaming,
  (streaming) => {
    if (!streaming) {
      flush()
      renderMermaid()
    }
  }
)

onMounted(() => {
  if (!props.streaming) {
    renderMermaid()
  }
})

onBeforeUnmount(() => clearTimeout(timer))
</script>
