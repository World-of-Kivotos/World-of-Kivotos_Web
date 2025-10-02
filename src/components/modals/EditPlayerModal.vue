<template>
  <!-- 透明背景遮罩 -->
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <!-- 白色模态框 -->
    <div 
      class="relative w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      @click.stop
    >
      <!-- 固定头部 -->
      <div class="flex-shrink-0 px-8 pt-8 pb-4">
        <div class="text-center">
          <h3 class="text-2xl font-bold text-gray-800 mb-2">编辑玩家信息</h3>
          <p class="text-sm text-gray-600">修改玩家的白名单信息</p>
        </div>
      </div>
      
      <!-- 可滚动内容区域 -->
      <div class="flex-1 overflow-y-auto px-8">
        <form @submit.prevent="handleSubmit" class="space-y-5" id="edit-player-form">
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
            </div>
            <p v-if="errors.name" class="text-xs text-red-500">{{ errors.name }}</p>
          </div>

          <!-- 玩家UUID显示框 -->
          <div class="space-y-2">
            <label class="text-sm text-gray-700 font-medium">玩家UUID</label>
            <div class="relative">
              <input 
                type="text" 
                v-model="form.uuid"
                disabled
                class="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 font-mono text-sm cursor-not-allowed"
              />
              <p class="mt-1.5 text-xs text-gray-500">UUID不可修改</p>
            </div>
          </div>

          <!-- 状态选择 -->
          <div class="space-y-2">
            <label class="text-sm text-gray-700 font-medium">状态</label>
            <select 
              v-model="form.status"
              :disabled="isLoading"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-100"
            >
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>

          <!-- 备注输入框 -->
          <div class="space-y-2">
            <label class="text-sm text-gray-700 font-medium">备注 (可选)</label>
            <textarea 
              placeholder="添加备注信息"
              v-model="form.notes"
              :disabled="isLoading"
              rows="3"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-100 resize-none"
            ></textarea>
          </div>

          <!-- 玩家信息显示 -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 class="text-sm font-semibold text-gray-800 mb-3">玩家信息</h4>
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span class="text-gray-600">添加时间</span>
                <div class="text-gray-900 mt-1">{{ formatDate(entry.createdAt) }}</div>
              </div>
              <div>
                <span class="text-gray-600">最后更新</span>
                <div class="text-gray-900 mt-1">{{ formatDate(entry.updatedAt) }}</div>
              </div>
            </div>
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
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button 
            type="submit" 
            form="edit-player-form"
            :disabled="isLoading || !hasChanges"
            class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="!isLoading">保存修改</span>
            <span v-else class="flex items-center justify-center">
              <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              保存中...
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import apiService from '../../services/api.js'

const props = defineProps({
  entry: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'success'])

const isLoading = ref(false)
const errorMessage = ref('')

const form = reactive({
  name: '',
  uuid: '',
  status: 'active',
  notes: ''
})

const originalForm = reactive({
  name: '',
  uuid: '',
  status: 'active',
  notes: ''
})

const errors = reactive({
  name: ''
})

// 计算是否有更改
const hasChanges = computed(() => {
  return form.name !== originalForm.name ||
         form.status !== originalForm.status ||
         form.notes !== originalForm.notes
})

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 表单验证
function validateForm() {
  errors.name = ''
  
  let isValid = true
  
  if (!form.name.trim()) {
    errors.name = '玩家名称不能为空'
    isValid = false
  } else if (form.name.length < 3 || form.name.length > 16) {
    errors.name = '玩家名称长度应在3-16个字符之间'
    isValid = false
  }
  
  return isValid
}

// 提交表单
async function handleSubmit() {
  if (!validateForm()) {
    return
  }
  
  if (!hasChanges.value) {
    emit('close')
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 构建更新数据
    const updateData = {}
    
    if (form.name !== originalForm.name) {
      updateData.name = form.name.trim()
    }
    
    if (form.status !== originalForm.status) {
      updateData.status = form.status
    }
    
    if (form.notes !== originalForm.notes) {
      updateData.notes = form.notes.trim() || null
    }
    
    const response = await apiService.updateWhitelistEntry(form.uuid, updateData)
    
    if (response.success) {
      emit('success')
    } else {
      errorMessage.value = response.error?.message || '更新失败'
    }
  } catch (err) {
    errorMessage.value = '更新失败: ' + err.message
  } finally {
    isLoading.value = false
  }
}

// 初始化表单数据
onMounted(() => {
  form.name = props.entry.name || ''
  form.uuid = props.entry.uuid || ''
  form.status = props.entry.status || 'active'
  form.notes = props.entry.notes || ''
  
  // 保存原始数据
  Object.assign(originalForm, form)
})
</script>
