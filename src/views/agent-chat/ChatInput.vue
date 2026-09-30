<template>
  <div class="chat-input">
    <el-input
      v-model="input"
      type="textarea"
      :autosize="{ minRows: 1, maxRows: 6 }"
      resize="none"
      placeholder="输入消息，Enter 发送 / Shift+Enter 换行"
      @keydown="onKeydown"
    />
    <div class="input-actions">
      <span class="input-hint">会话：{{ sessionId || '首轮自动分配' }}</span>
      <div class="input-btns">
        <el-button v-if="streaming" type="danger" plain size="default" :icon="CloseBold" @click="emit('stop')">停止</el-button>
        <el-button
          type="primary"
          size="default"
          :icon="Promotion"
          :disabled="!canSend"
          @click="emit('send')"
        >发送</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Promotion, CloseBold } from '@element-plus/icons-vue'

const input = defineModel({ type: String, default: '' })

const props = defineProps({
  sessionId: { type: String, default: '' },
  streaming: { type: Boolean, default: false }
})

const emit = defineEmits(['send', 'stop'])

const canSend = computed(() => input.value.trim().length > 0 && !props.streaming)

const onKeydown = (e) => {
  // isComposing：输入法组词中的回车不触发发送
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    emit('send')
  }
}
</script>

<style scoped>
.chat-input {
  padding: 14px 20px 16px;
  border-top: 1px solid #eef1f6;
  background: #fff;
}
.chat-input :deep(.el-textarea__inner) {
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  box-shadow: 0 0 0 1px #e4e7ed inset;
}
.chat-input :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #1765ad inset;
}
.input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}
.input-hint {
  font-size: 12px;
  color: #c0c4cc;
}
.input-btns {
  display: flex;
  gap: 10px;
}
</style>
