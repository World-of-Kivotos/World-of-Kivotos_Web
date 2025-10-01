<template>
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">编辑玩家信息</h3>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">玩家名称 *</span>
          </label>
          <input 
            type="text" 
            placeholder="输入玩家名称" 
            class="input input-bordered"
            v-model="form.name"
            :class="{ 'input-error': errors.name }"
            required
          />
          <label v-if="errors.name" class="label">
            <span class="label-text-alt text-error">{{ errors.name }}</span>
          </label>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">玩家UUID *</span>
          </label>
          <input 
            type="text" 
            placeholder="输入玩家UUID" 
            class="input input-bordered"
            v-model="form.uuid"
            :class="{ 'input-error': errors.uuid }"
            disabled
          />
          <label class="label">
            <span class="label-text-alt">UUID不可修改</span>
          </label>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">状态</span>
          </label>
          <select class="select select-bordered" v-model="form.status">
            <option value="active">活跃</option>
            <option value="inactive">不活跃</option>
            <option value="banned">已封禁</option>
          </select>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">备注</span>
          </label>
          <textarea 
            class="textarea textarea-bordered" 
            placeholder="添加备注信息（可选）"
            v-model="form.notes"
            rows="3"
          ></textarea>
        </div>

        <!-- 玩家信息 -->
        <div class="bg-base-200 rounded-lg p-4 mb-4">
          <h4 class="font-semibold mb-2">玩家信息</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-base-content/70">添加时间:</span>
              <div>{{ formatDate(entry.created_at) }}</div>
            </div>
            <div>
              <span class="text-base-content/70">最后在线:</span>
              <div>{{ entry.last_seen ? formatDate(entry.last_seen) : '从未在线' }}</div>
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <div class="modal-action">
          <button 
            type="button" 
            class="btn btn-ghost"
            @click="$emit('close')"
            :disabled="isLoading"
          >
            取消
          </button>
          <button 
            type="submit" 
            class="btn btn-primary"
            :class="{ 'loading': isLoading }"
            :disabled="isLoading || !hasChanges"
          >
            {{ isLoading ? '保存中...' : '保存更改' }}
          </button>
        </div>
      </form>
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