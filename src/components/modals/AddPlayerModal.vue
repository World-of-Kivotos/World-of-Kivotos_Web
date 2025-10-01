<template>
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">添加玩家到白名单</h3>
      
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
            required
          />
          <label v-if="errors.uuid" class="label">
            <span class="label-text-alt text-error">{{ errors.uuid }}</span>
          </label>
          <label class="label">
            <span class="label-text-alt">格式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</span>
          </label>
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
            :disabled="isLoading"
          >
            {{ isLoading ? '添加中...' : '添加玩家' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { addWhitelistEntry } from '../../stores/whitelist.js'

const emit = defineEmits(['close', 'success'])

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
  
  if (!form.uuid.trim()) {
    errors.uuid = 'UUID不能为空'
    isValid = false
  } else if (!validateUUID(form.uuid)) {
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
    const result = await addWhitelistEntry({
      name: form.name.trim(),
      uuid: form.uuid.trim().toLowerCase(),
      notes: form.notes.trim() || undefined
    })
    
    if (result.success) {
      emit('success')
    } else {
      errorMessage.value = result.error
    }
  } catch (err) {
    errorMessage.value = '添加失败: ' + err.message
  } finally {
    isLoading.value = false
  }
}
</script>