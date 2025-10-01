<template>
  <div class="space-y-6">
    <!-- 服务器状态概览 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 服务器状态 -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title text-sm">服务器状态</h3>
          <div class="flex items-center space-x-2">
            <div :class="[
              'badge',
              serverState.status.online ? 'badge-success' : 'badge-error'
            ]">
              {{ serverState.status.online ? '在线' : '离线' }}
            </div>
            <span v-if="serverState.isLoading.status" class="loading loading-spinner loading-xs"></span>
          </div>
          <div v-if="serverState.status.online" class="text-xs text-base-content/70">
            <div>版本: {{ serverState.status.version }}</div>
            <div>运行时间: {{ formatUptime(serverState.status.uptime) }}</div>
          </div>
        </div>
      </div>

      <!-- 在线玩家 -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title text-sm">在线玩家</h3>
          <div class="text-2xl font-bold">
            {{ serverState.status.players.online }}/{{ serverState.status.players.max }}
          </div>
          <div class="text-xs text-base-content/70">
            当前在线玩家数量
          </div>
        </div>
      </div>

      <!-- TPS -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title text-sm">TPS</h3>
          <div class="flex items-center space-x-2">
            <span class="text-2xl font-bold">{{ serverState.performance.tps.toFixed(1) }}</span>
            <div :class="[
              'badge badge-sm',
              getTpsStatusColor() === 'success' ? 'badge-success' : 
              getTpsStatusColor() === 'warning' ? 'badge-warning' : 'badge-error'
            ]">
              {{ getTpsStatusColor() === 'success' ? '良好' : 
                 getTpsStatusColor() === 'warning' ? '一般' : '较差' }}
            </div>
          </div>
          <div class="text-xs text-base-content/70">
            MSPT: {{ serverState.performance.mspt.toFixed(2) }}ms
          </div>
        </div>
      </div>

      <!-- 内存使用 -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title text-sm">内存使用</h3>
          <div class="text-lg font-bold">
            {{ serverState.performance.memory.usage.toFixed(1) }}%
          </div>
          <div class="text-xs text-base-content/70">
            {{ formatBytes(serverState.performance.memory.used) }} / 
            {{ formatBytes(serverState.performance.memory.total) }}
          </div>
          <progress 
            class="progress w-full" 
            :class="[
              getMemoryStatusColor() === 'success' ? 'progress-success' : 
              getMemoryStatusColor() === 'warning' ? 'progress-warning' : 'progress-error'
            ]"
            :value="serverState.performance.memory.usage" 
            max="100"
          ></progress>
        </div>
      </div>
    </div>

    <!-- 详细信息标签页 -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div role="tablist" class="tabs tabs-lifted">
          <!-- 性能监控标签 -->
          <input 
            type="radio" 
            name="server_tabs" 
            role="tab" 
            class="tab" 
            aria-label="性能监控" 
            :checked="activeTab === 'performance'"
            @change="activeTab = 'performance'"
          />
          <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
            <div v-if="serverState.isLoading.performance" class="flex justify-center">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
            <div v-else-if="serverState.error.performance" class="alert alert-error">
              <span>{{ serverState.error.performance }}</span>
            </div>
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- CPU 使用情况 -->
              <div>
                <h4 class="font-semibold mb-2">CPU 使用情况</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span>使用率:</span>
                    <span>{{ serverState.performance.cpu.usage.toFixed(1) }}%</span>
                  </div>
                  <progress 
                    class="progress progress-primary w-full" 
                    :value="serverState.performance.cpu.usage" 
                    max="100"
                  ></progress>
                  <div class="text-sm text-base-content/70">
                    核心数: {{ serverState.performance.cpu.cores }}
                  </div>
                </div>
              </div>

              <!-- 磁盘使用情况 -->
              <div>
                <h4 class="font-semibold mb-2">磁盘使用情况</h4>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span>使用率:</span>
                    <span>{{ serverState.performance.disk.usage.toFixed(1) }}%</span>
                  </div>
                  <progress 
                    class="progress progress-secondary w-full" 
                    :value="serverState.performance.disk.usage" 
                    max="100"
                  ></progress>
                  <div class="text-sm text-base-content/70">
                    {{ formatBytes(serverState.performance.disk.used) }} / 
                    {{ formatBytes(serverState.performance.disk.total) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 在线玩家标签 -->
          <input 
            type="radio" 
            name="server_tabs" 
            role="tab" 
            class="tab" 
            aria-label="在线玩家" 
            :checked="activeTab === 'players'"
            @change="activeTab = 'players'"
          />
          <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
            <div v-if="serverState.isLoading.players" class="flex justify-center">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
            <div v-else-if="serverState.error.players" class="alert alert-error">
              <span>{{ serverState.error.players }}</span>
            </div>
            <div v-else>
              <div v-if="serverState.onlinePlayers.length === 0" class="text-center text-base-content/70 py-8">
                当前没有玩家在线
              </div>
              <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div 
                  v-for="player in serverState.onlinePlayers" 
                  :key="player.uuid"
                  class="card bg-base-200 shadow"
                >
                  <div class="card-body p-4">
                    <div class="flex items-center space-x-3">
                      <div class="avatar placeholder">
                        <div class="bg-neutral text-neutral-content rounded-full w-10">
                          <span class="text-xs">{{ player.name.charAt(0).toUpperCase() }}</span>
                        </div>
                      </div>
                      <div>
                        <div class="font-semibold">{{ player.name }}</div>
                        <div class="text-xs text-base-content/70">
                          在线时长: {{ formatUptime(player.playtime || 0) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 服务器日志标签 -->
          <input 
            type="radio" 
            name="server_tabs" 
            role="tab" 
            class="tab" 
            aria-label="服务器日志" 
            :checked="activeTab === 'logs'"
            @change="activeTab = 'logs'"
          />
          <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
            <!-- 日志过滤器 -->
            <div class="flex flex-wrap gap-4 mb-4">
              <select 
                v-model="logFilters.level" 
                class="select select-bordered select-sm"
                @change="handleLogFilterChange"
              >
                <option value="">所有级别</option>
                <option value="INFO">信息</option>
                <option value="WARN">警告</option>
                <option value="ERROR">错误</option>
                <option value="DEBUG">调试</option>
              </select>
              
              <input 
                v-model="logFilters.search" 
                type="text" 
                placeholder="搜索日志内容..." 
                class="input input-bordered input-sm flex-1 min-w-0"
                @input="debounceLogSearch"
              />
              
              <button 
                class="btn btn-primary btn-sm"
                @click="handleLogFilterChange"
                :disabled="serverState.isLoading.logs"
              >
                <span v-if="serverState.isLoading.logs" class="loading loading-spinner loading-xs"></span>
                刷新
              </button>
            </div>

            <!-- 日志列表 -->
            <div v-if="serverState.isLoading.logs" class="flex justify-center">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
            <div v-else-if="serverState.error.logs" class="alert alert-error">
              <span>{{ serverState.error.logs }}</span>
            </div>
            <div v-else>
              <div v-if="serverState.logs.entries.length === 0" class="text-center text-base-content/70 py-8">
                没有找到日志记录
              </div>
              <div v-else class="space-y-2">
                <div 
                  v-for="log in serverState.logs.entries" 
                  :key="log.id"
                  class="card bg-base-200 shadow-sm"
                >
                  <div class="card-body p-3">
                    <div class="flex items-start space-x-3">
                      <div :class="[
                        'badge badge-sm',
                        log.level === 'ERROR' ? 'badge-error' :
                        log.level === 'WARN' ? 'badge-warning' :
                        log.level === 'INFO' ? 'badge-info' : 'badge-neutral'
                      ]">
                        {{ log.level }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-mono break-all">{{ log.message }}</div>
                        <div class="text-xs text-base-content/70 mt-1">
                          {{ new Date(log.timestamp).toLocaleString() }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 分页 -->
              <div v-if="serverState.logs.totalCount > serverState.logs.pageSize" class="flex justify-center mt-6">
                <div class="join">
                  <button 
                    class="join-item btn btn-sm"
                    :disabled="serverState.logs.currentPage <= 1"
                    @click="handleLogPageChange(serverState.logs.currentPage - 1)"
                  >
                    上一页
                  </button>
                  <button class="join-item btn btn-sm btn-active">
                    {{ serverState.logs.currentPage }}
                  </button>
                  <button 
                    class="join-item btn btn-sm"
                    :disabled="serverState.logs.currentPage >= Math.ceil(serverState.logs.totalCount / serverState.logs.pageSize)"
                    @click="handleLogPageChange(serverState.logs.currentPage + 1)"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  serverState, 
  fetchServerStatus, 
  fetchServerPerformance, 
  fetchOnlinePlayers, 
  fetchServerLogs,
  refreshAllServerData,
  formatBytes, 
  formatUptime, 
  getServerStatusColor, 
  getTpsStatusColor, 
  getMemoryStatusColor 
} from '../stores/server.js'

// 当前活动标签
const activeTab = ref('performance')

// 日志过滤器
const logFilters = ref({
  level: '',
  search: ''
})

// 自动刷新定时器
let refreshInterval = null

// 日志搜索防抖定时器
let searchDebounceTimer = null

// 组件挂载时初始化
onMounted(async () => {
  // 初始加载数据
  await refreshAllServerData()
  await fetchServerLogs()
  
  // 设置自动刷新（每30秒）
  refreshInterval = setInterval(async () => {
    await refreshAllServerData()
  }, 30000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})

// 处理日志过滤器变化
async function handleLogFilterChange() {
  await fetchServerLogs(1, logFilters.value)
}

// 防抖搜索
function debounceLogSearch() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  
  searchDebounceTimer = setTimeout(() => {
    handleLogFilterChange()
  }, 500)
}

// 处理日志分页变化
async function handleLogPageChange(page) {
  await fetchServerLogs(page, logFilters.value)
}
</script>