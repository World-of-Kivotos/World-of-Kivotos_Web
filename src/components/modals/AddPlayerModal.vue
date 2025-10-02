<template>
  <!-- 透明背景遮罩 -->
  <Transition name="modal-backdrop">
    <div 
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop"
      @click.self="$emit('close')"
    >
      <!-- 白色模态框 -->
      <div 
        class="relative w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col modal-content"
        @click.stop
      >

      <!-- 固定头部 -->
      <div class="flex-shrink-0 px-8 pt-8 pb-4">
        <div class="text-center">
          <h3 class="text-2xl font-bold text-gray-800 mb-2">添加玩家到白名单</h3>
          <p class="text-sm text-gray-600">填写玩家信息以添加到白名单</p>
        </div>
      </div>
      
      <!-- 可滚动内容区域 -->
      <div class="flex-1 overflow-y-auto px-8">
        <form @submit.prevent="handleSubmit" class="space-y-5" id="add-player-form">
          <!-- 玩家名称输入框 -->
          <div class="space-y-2">
            <label class="text-sm text-gray-700 font-medium">玩家名称 *</label>
            <div class="relative">
              <input 
                type="text" 
                placeholder="请输入玩家游戏名称"
                v-model="form.name"
                :disabled="isLoading"
                :class="[
                  'w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:bg-gray-100',
                  errors.name ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                ]"
                required
              />
              <p class="mt-1.5 text-xs text-gray-500">支持中英文及数字</p>
            </div>
            <p v-if="errors.name" class="text-xs text-red-500">{{ errors.name }}</p>
          </div>

          <!-- 玩家UUID输入框 -->
          <div class="space-y-2">
            <label class="text-sm text-gray-700 font-medium">玩家UUID (可选)</label>
            <div class="relative">
              <input 
                type="text" 
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                v-model="form.uuid"
                :disabled="isLoading"
                :class="[
                  'w-full px-4 py-3 bg-gray-50 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:bg-gray-100 font-mono text-sm',
                  errors.uuid ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                ]"
              />
              <p class="mt-1.5 text-xs text-gray-500">留空时将在玩家首次登录时自动获取</p>
            </div>
            <p v-if="errors.uuid" class="text-xs text-red-500">{{ errors.uuid }}</p>
          </div>

          <!-- 备注输入框 -->
          <div class="space-y-2">
            <label class="text-sm text-gray-700 font-medium">备注 (可选)</label>
            <textarea 
              placeholder="添加备注信息,例如:审批时间、推荐人等"
              v-model="form.notes"
              :disabled="isLoading"
              rows="3"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-100 resize-none"
            ></textarea>
            <p class="text-xs text-gray-500">最多200个字符</p>
          </div>

          <!-- 错误提示 -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
            {{ errorMessage }}
          </div>
        </form>
      </div>

      <!-- 固定底部按钮组 -->
      <div class="flex-shrink-0 border-t border-gray-200 px-8 py-6">
        <div class="flex gap-3">
          <button 
            type="button" 
            @click="$emit('close')"
            :disabled="isLoading"
            class="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all disabled:opacity-50"
          >
            取消
          </button>
          <button 
            type="submit"
            form="add-player-form"
            :disabled="isLoading || !form.name.trim()"
            class="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {{ isLoading ? '添加中...' : '添加玩家' }}
          </button>
        </div>
      </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive } from 'vue'

const emit = defineEmits(['close', 'submit'])

const isLoading = ref(false)
const errorMessage = ref('')

const form = reactive({
  name: '',
  uuid: '',
  notes: ''
})

const errors = reactive({
  name: '',
  uuid: ''
})

// UUID格式验证
function validateUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// 表单验证
function validateForm() {
  errors.name = ''
  errors.uuid = ''
  
  let isValid = true
  
  if (!form.name.trim()) {
    errors.name = '玩家名称不能为空'
    isValid = false
  } else if (form.name.length < 3 || form.name.length > 16) {
    errors.name = '玩家名称长度应在3-16个字符之间'
    isValid = false
  }
  
  // UUID是可选的,但如果填写了必须是有效格式
  if (form.uuid.trim() && !validateUUID(form.uuid)) {
    errors.uuid = 'UUID格式不正确'
    isValid = false
  }
  
  return isValid
}

// 提交表单
async function handleSubmit() {
  if (!validateForm()) {
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 直接emit数据给父组件处理,而不是在modal中调用store
    const playerData = {
      name: form.name.trim(),
      uuid: form.uuid.trim() ? form.uuid.trim().toLowerCase() : undefined,
      notes: form.notes.trim() || undefined
    }
    
    emit('submit', playerData)
    isLoading.value = false
  } catch (err) {
    errorMessage.value = '添加失败: ' + err.message
    isLoading.value = false
  }
}
</script>
