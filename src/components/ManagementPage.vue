<template>
  <div class="min-h-screen bg-base-200">
    <!-- 导航栏 -->
    <Navbar @logout="$emit('close')" />
    
    <!-- 主要内容 -->
    <div class="container mx-auto px-4 py-8">
      <!-- 标签页导航 -->
      <div role="tablist" class="tabs tabs-lifted mb-6">
        <!-- 白名单管理标签 -->
        <input 
          type="radio" 
          name="main_tabs" 
          role="tab" 
          class="tab" 
          aria-label="白名单管理" 
          :checked="activeTab === 'whitelist'"
          @change="activeTab = 'whitelist'"
        />
        <div role="tabpanel" class="tab-content bg-base-100 border-base-300 rounded-box p-6">
          <!-- 白名单表格 -->
          <div class="backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 p-6">
            <WhitelistTable />
          </div>
        </div>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" class="toast toast-top toast-end">
      <div class="alert" :class="{
        'alert-success': message.type === 'success',
        'alert-error': message.type === 'error',
        'alert-warning': message.type === 'warning'
      }">
        <span>{{ message.text }}</span>
        <button class="btn btn-sm btn-ghost" @click="message = null">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Navbar from './Navbar.vue'
import WhitelistTable from './WhitelistTable.vue'

// 定义事件
defineEmits(['close'])

// 当前活动标签
const activeTab = ref('whitelist')
</script>

<style scoped>
/* 页面特定样式 */
</style>