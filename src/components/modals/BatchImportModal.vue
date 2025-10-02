<template>
  <!-- 透明背景遮罩 -->
  <Transition name="modal-backdrop">
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      @click.self="$emit('close')"
    >
      <!-- 白色模态框 - 更宽以容纳批量导入内容 -->
      <div 
        class="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto modal-content"
        @click.stop
      >

      <!-- 标题 -->
      <div class="text-center mb-6">
        <h3 class="text-2xl font-bold text-gray-800 mb-2">批量导入玩家</h3>
        <p class="text-sm text-gray-600">通过文本或文件批量添加多个玩家</p>
      </div>

      <!-- 标签页切换 -->
      <div class="flex mb-6 bg-gray-100 rounded-lg p-1">
        <button 
          @click="activeTab = 'text'"
          :class="[
            'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200',
            activeTab === 'text' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
        >
          文本导入
        </button>
        <button 
          @click="activeTab = 'file'"
          :class="[
            'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200',
            activeTab === 'file' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          ]"
        >
          文件导入
        </button>
      </div>

      <!-- 文本导入 -->
      <div v-if="activeTab === 'text'" class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm text-gray-700 font-medium">玩家列表</label>
          <textarea 
            placeholder="每行一个玩家，格式示例：&#10;Steve,069a79f4-44e9-4726-a5be-fca90e38aaf5&#10;Alex,ec561538-f3fd-461d-aff5-086b22154bce"
            v-model="textInput"
            :disabled="isLoading"
            rows="8"
            class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-100 resize-none font-mono text-sm"
          ></textarea>
          <p class="text-xs text-gray-500">支持格式: 玩家名称,UUID 或 玩家名称,UUID,备注</p>
        </div>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="text-sm text-blue-800">
              <p class="font-medium mb-1">格式说明</p>
              <p class="text-xs text-blue-700">• 每行一个玩家信息</p>
              <p class="text-xs text-blue-700">• UUID可选，留空时将在首次登录时获取</p>
              <p class="text-xs text-blue-700">• 备注为可选项</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 文件导入 -->
      <div v-if="activeTab === 'file'" class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm text-gray-700 font-medium">选择文件</label>
          <div class="relative">
            <input 
              type="file" 
              accept=".txt,.csv"
              @change="handleFileSelect"
              :disabled="isLoading"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-100"
            />
            <p class="mt-1.5 text-xs text-gray-500">支持 .txt, .csv 格式</p>
          </div>
        </div>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="text-sm text-blue-800">
              <p class="font-medium mb-2">文件格式要求</p>
              <p class="text-xs text-blue-700 mb-1">• 每行一个玩家</p>
              <p class="text-xs text-blue-700 mb-1">• CSV格式: 玩家名称,UUID,备注(可选)</p>
              <p class="text-xs text-blue-700">• TXT格式: 玩家名称,UUID 或 玩家名称 UUID(空格分隔)</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div v-if="parsedPlayers.length > 0" class="space-y-4 mt-6">
        <div class="flex items-center justify-between">
          <h4 class="text-lg font-semibold text-gray-800">数据预览</h4>
          <span class="text-sm text-gray-600">共 {{ parsedPlayers.length }} 个玩家</span>
        </div>
        
        <!-- 统计卡片 -->
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div class="text-xs text-gray-600 mb-1">总数</div>
            <div class="text-2xl font-bold text-gray-900">{{ parsedPlayers.length }}</div>
          </div>
          <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="text-xs text-green-700 mb-1">有效</div>
            <div class="text-2xl font-bold text-green-700">{{ validPlayers.length }}</div>
          </div>
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="text-xs text-red-700 mb-1">无效</div>
            <div class="text-2xl font-bold text-red-700">{{ invalidPlayers.length }}</div>
          </div>
        </div>
        
        <!-- 玩家列表 -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr class="text-gray-700 border-b border-gray-200">
                <th class="px-4 py-3 text-left font-medium">玩家名称</th>
                <th class="px-4 py-3 text-left font-medium">UUID</th>
                <th class="px-4 py-3 text-left font-medium">备注</th>
                <th class="px-4 py-3 text-center font-medium">状态</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="(player, index) in parsedPlayers" :key="index" class="text-gray-700 hover:bg-gray-100">
                <td class="px-4 py-3">{{ player.name }}</td>
                <td class="px-4 py-3">
                  <code class="text-xs text-blue-600">{{ player.uuid || '-' }}</code>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ player.notes || '-' }}</td>
                <td class="px-4 py-3 text-center">
                  <span :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    player.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  ]">
                    {{ player.valid ? '✓ 有效' : '✗ 无效' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
        {{ errorMessage }}
      </div>

      <!-- 按钮组 -->
      <div class="flex gap-3 mt-6">
        <button 
          type="button" 
          @click="$emit('close')"
          :disabled="isLoading"
          class="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          取消
        </button>
        <button 
          v-if="parsedPlayers.length === 0"
          type="button" 
          @click="parseInput"
          :disabled="isLoading || (!textInput && !fileContent)"
          class="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          解析数据
        </button>
        <button 
          v-else
          type="button" 
          @click="handleImport"
          :disabled="isLoading || validPlayers.length === 0"
          class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="!isLoading">导入 {{ validPlayers.length }} 个玩家</span>
          <span v-else class="flex items-center justify-center">
            <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            导入中...
          </span>
        </button>
      </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useWhitelistStore } from '../../stores/whitelist.js'

const emit = defineEmits(['close', 'success'])
const whitelistStore = useWhitelistStore()

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
    
    // 如果只有一个字段,作为玩家名称,UUID留空
    if (parts.length === 1) {
      const name = parts[0]
      const isValidName = validatePlayerName(name)
      players.push({
        name: name,
        uuid: '',
        notes: '',
        valid: isValidName,
        error: !isValidName ? '玩家名称无效' : ''
      })
      return
    }
    
    const [name, uuid, notes = ''] = parts
    const isValidName = validatePlayerName(name)
    // UUID可选：允许为空、'-'、或有效的UUID格式
    const uuidValue = (uuid === '-' || !uuid) ? '' : uuid
    const isValidUUID = !uuidValue || validateUUID(uuidValue)
    
    players.push({
      name: name || '',
      uuid: uuidValue,
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
      uuid: player.uuid ? player.uuid.toLowerCase() : undefined,
      notes: player.notes || undefined
    }))
    
    const result = await whitelistStore.batchAddPlayers(playersToImport)
    
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