<template>
  <div class="modal modal-open">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">批量导入玩家</h3>
      
      <div class="tabs tabs-boxed mb-4">
        <a 
          class="tab"
          :class="{ 'tab-active': activeTab === 'text' }"
          @click="activeTab = 'text'"
        >
          文本导入
        </a>
        <a 
          class="tab"
          :class="{ 'tab-active': activeTab === 'file' }"
          @click="activeTab = 'file'"
        >
          文件导入
        </a>
      </div>

      <!-- 文本导入 -->
      <div v-if="activeTab === 'text'" class="mb-4">
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">玩家列表</span>
            <span class="label-text-alt">每行一个玩家，格式：玩家名称,UUID</span>
          </label>
          <textarea 
            class="textarea textarea-bordered h-32" 
            placeholder="示例：&#10;Steve,069a79f4-44e9-4726-a5be-fca90e38aaf5&#10;Alex,ec561538-f3fd-461d-aff5-086b22154bce"
            v-model="textInput"
          ></textarea>
        </div>
        
        <div class="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>支持格式：玩家名称,UUID 或 玩家名称,UUID,备注</span>
        </div>
      </div>

      <!-- 文件导入 -->
      <div v-if="activeTab === 'file'" class="mb-4">
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">选择文件</span>
            <span class="label-text-alt">支持 .txt, .csv 格式</span>
          </label>
          <input 
            type="file" 
            class="file-input file-input-bordered w-full"
            accept=".txt,.csv"
            @change="handleFileSelect"
          />
        </div>
        
        <div class="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <p>文件格式要求：</p>
            <ul class="list-disc list-inside mt-2 text-sm">
              <li>每行一个玩家</li>
              <li>CSV格式：玩家名称,UUID,备注（可选）</li>
              <li>TXT格式：玩家名称,UUID 或 玩家名称 UUID（空格分隔）</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div v-if="parsedPlayers.length > 0" class="mb-4">
        <h4 class="font-semibold mb-2">预览 ({{ parsedPlayers.length }} 个玩家)</h4>
        <div class="overflow-x-auto max-h-48">
          <table class="table table-compact w-full">
            <thead>
              <tr>
                <th>玩家名称</th>
                <th>UUID</th>
                <th>备注</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(player, index) in parsedPlayers" :key="index">
                <td>{{ player.name }}</td>
                <td>
                  <code class="text-xs">{{ player.uuid }}</code>
                </td>
                <td>{{ player.notes || '-' }}</td>
                <td>
                  <div class="badge" :class="{
                    'badge-success': player.valid,
                    'badge-error': !player.valid
                  }">
                    {{ player.valid ? '有效' : '无效' }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="stats stats-horizontal shadow mt-4">
          <div class="stat">
            <div class="stat-title">总数</div>
            <div class="stat-value text-sm">{{ parsedPlayers.length }}</div>
          </div>
          <div class="stat">
            <div class="stat-title">有效</div>
            <div class="stat-value text-sm text-success">{{ validPlayers.length }}</div>
          </div>
          <div class="stat">
            <div class="stat-title">无效</div>
            <div class="stat-value text-sm text-error">{{ invalidPlayers.length }}</div>
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
          type="button" 
          class="btn btn-secondary"
          @click="parseInput"
          :disabled="isLoading || (!textInput && !fileContent)"
        >
          解析数据
        </button>
        <button 
          type="button" 
          class="btn btn-primary"
          :class="{ 'loading': isLoading }"
          :disabled="isLoading || validPlayers.length === 0"
          @click="handleImport"
        >
          {{ isLoading ? '导入中...' : `导入 ${validPlayers.length} 个玩家` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { batchAddWhitelist } from '../../stores/whitelist.js'

const emit = defineEmits(['close', 'success'])

const activeTab = ref('text')
const textInput = ref('')
const fileContent = ref('')
const parsedPlayers = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

// 计算属性
const validPlayers = computed(() => 
  parsedPlayers.value.filter(player => player.valid)
)

const invalidPlayers = computed(() => 
  parsedPlayers.value.filter(player => !player.valid)
)

// UUID格式验证
function validateUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// 验证玩家名称
function validatePlayerName(name) {
  return name && name.length >= 3 && name.length <= 16 && /^[a-zA-Z0-9_]+$/.test(name)
}

// 处理文件选择
function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    fileContent.value = e.target.result
    textInput.value = fileContent.value
  }
  reader.readAsText(file)
}

// 解析输入数据
function parseInput() {
  errorMessage.value = ''
  parsedPlayers.value = []
  
  const input = textInput.value.trim()
  if (!input) {
    errorMessage.value = '请输入玩家数据'
    return
  }
  
  const lines = input.split('\n').filter(line => line.trim())
  const players = []
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return
    
    // 支持多种分隔符：逗号、制表符、多个空格
    const parts = trimmedLine.split(/[,\t]|\s{2,}/).map(part => part.trim())
    
    if (parts.length < 2) {
      // 尝试用单个空格分隔
      const spaceParts = trimmedLine.split(/\s+/)
      if (spaceParts.length >= 2) {
        parts.splice(0, parts.length, ...spaceParts)
      }
    }
    
    if (parts.length < 2) {
      players.push({
        name: trimmedLine,
        uuid: '',
        notes: '',
        valid: false,
        error: '格式错误：缺少UUID'
      })
      return
    }
    
    const [name, uuid, notes = ''] = parts
    const isValidName = validatePlayerName(name)
    const isValidUUID = validateUUID(uuid)
    
    players.push({
      name: name || '',
      uuid: uuid || '',
      notes: notes || '',
      valid: isValidName && isValidUUID,
      error: !isValidName ? '玩家名称无效' : !isValidUUID ? 'UUID格式无效' : ''
    })
  })
  
  parsedPlayers.value = players
  
  if (players.length === 0) {
    errorMessage.value = '未找到有效的玩家数据'
  }
}

// 执行导入
async function handleImport() {
  if (validPlayers.value.length === 0) {
    errorMessage.value = '没有有效的玩家数据可导入'
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const playersToImport = validPlayers.value.map(player => ({
      name: player.name,
      uuid: player.uuid.toLowerCase(),
      notes: player.notes || undefined
    }))
    
    const result = await batchAddWhitelist(playersToImport)
    
    if (result.success) {
      emit('success')
    } else {
      errorMessage.value = result.error
    }
  } catch (err) {
    errorMessage.value = '批量导入失败: ' + err.message
  } finally {
    isLoading.value = false
  }
}
</script>