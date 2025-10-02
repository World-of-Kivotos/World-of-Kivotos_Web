<template>
  <!-- 透明背景遮罩 -->
  <Transition name="modal-backdrop">
    <div 
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop"
      @click.self="$emit('close')"
    >
      <!-- 白色模态框 -->
      <div 
        class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden modal-content"
        @click.stop
      >

      <!-- 头部 - 警告图标 -->
      <div class="px-8 pt-8 pb-4">
        <div class="text-center">
          <!-- 警告图标 -->
          <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          
          <h3 class="text-2xl font-bold text-gray-800 mb-2">确认删除玩家</h3>
          <p class="text-sm text-gray-600">此操作将从白名单中移除该玩家</p>
        </div>
      </div>
      
      <!-- 玩家信息展示 -->
      <div class="px-8 pb-6">
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-5">
          <!-- 玩家名称 -->
          <div class="mb-4">
            <div class="flex items-center gap-3 mb-2">
              <div class="avatar placeholder">
                <div class="bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center">
                  <span class="text-lg font-bold">{{ player.name ? player.name.charAt(0).toUpperCase() : '?' }}</span>
                </div>
              </div>
              <div class="flex-1">
                <div class="text-xs text-gray-500 mb-1">玩家名称</div>
                <div class="text-lg font-bold text-gray-900">{{ player.name || '-' }}</div>
              </div>
            </div>
          </div>

          <!-- UUID -->
          <div class="mb-3" v-if="player.uuid && player.uuid !== 'null' && player.uuid !== 'undefined'">
            <div class="text-xs text-gray-500 mb-1">UUID</div>
            <div class="text-sm font-mono text-gray-700 bg-white px-3 py-2 rounded border border-gray-200 break-all">
              {{ player.uuid }}
            </div>
          </div>
          <div class="mb-3" v-else>
            <div class="text-xs text-gray-500 mb-1">UUID</div>
            <div class="text-sm text-gray-400 bg-white px-3 py-2 rounded border border-gray-200">
              未绑定
            </div>
          </div>

          <!-- 添加时间 -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div class="text-gray-500 mb-1">添加时间</div>
              <div class="text-gray-900 font-medium">{{ formatDate(player.createdAt) }}</div>
            </div>
            <div>
              <div class="text-gray-500 mb-1">状态</div>
              <div>
                <span :class="[
                  'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                  player.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                ]">
                  {{ player.isActive !== false ? '正常' : '封禁' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 警告提示 -->
        <div class="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
          <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <div class="text-xs text-amber-800">
            <div class="font-semibold mb-1">注意</div>
            <div>删除后该玩家将无法进入服务器,此操作不可恢复。</div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="border-t border-gray-200 px-8 py-6">
        <div class="flex gap-3">
          <button 
            type="button" 
            @click="$emit('close')"
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all font-medium"
          >
            取消
          </button>
          <button 
            type="button" 
            @click="handleConfirm"
            class="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
          >
            确认删除
          </button>
        </div>
      </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  player: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'confirm'])

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleConfirm = () => {
  emit('confirm', props.player)
}
</script>

<style scoped>
/* 自定义样式 */
</style>
