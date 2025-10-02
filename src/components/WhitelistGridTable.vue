<template>
  <div class="whitelist-grid-container">
    <!-- 工具栏 -->
    <div class="grid-toolbar bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
      <div class="flex flex-wrap gap-4 items-center justify-between">
        <!-- 左侧操作按钮 -->
        <div class="flex flex-wrap gap-2">
          <button 
            @click="showAddModal = true"
            class="custom-btn custom-btn-primary"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            添加玩家
          </button>
          
          <button 
            @click="showBatchImportModal = true"
            class="custom-btn custom-btn-white"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
            </svg>
            批量导入
          </button>
          
          <button 
            v-if="selectedRows.length > 0"
            @click="deleteSelectedRows"
            class="custom-btn custom-btn-white"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            删除选中
          </button>
          
          <button 
            @click="refreshData"
            :disabled="isLoading"
            class="custom-btn custom-btn-white"
          >
            <svg class="w-4 h-4 mr-1.5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            刷新
          </button>
          
          <button 
            @click="resetColumnState"
            class="custom-btn custom-btn-white"
            title="重置列的宽度、位置和排序"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            重置列
          </button>
        </div>
      </div>
    </div>

    <!-- AG Grid 表格 -->
    <div class="grid-wrapper">
      <ag-grid-vue
        ref="agGrid"
        class="ag-theme-custom"
        style="width: 100%; height: 100%;"
        :columnDefs="columnDefs"
        :rowData="rowData"
        :defaultColDef="defaultColDef"
        :gridOptions="gridOptions"
        :loading="isLoading"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-value-changed="onCellValueChanged"
        @row-double-clicked="onRowDoubleClicked"
        @column-moved="onColumnMoved"
        @column-resized="onColumnResized"
        @column-visible="onColumnVisible"
        @column-pinned="onColumnPinned"
        @sort-changed="onSortChanged"
        @filter-changed="onFilterChanged"
      />
    </div>

    <!-- 统计信息 -->
    <div class="grid-stats bg-white border border-gray-200 rounded-lg p-4 mt-4 shadow-sm">
      <div class="flex flex-wrap gap-4 text-sm text-gray-700">
        <div class="stat-item">
          <span class="font-semibold">总计:</span>
          <span class="text-blue-600 font-medium">{{ totalCount }}</span>
        </div>
        <div class="stat-item">
          <span class="font-semibold">正常:</span>
          <span class="text-green-600 font-medium">{{ enabledCount }}</span>
        </div>
        <div class="stat-item">
          <span class="font-semibold">封禁:</span>
          <span class="text-red-600 font-medium">{{ disabledCount }}</span>
        </div>
        <div class="stat-item">
          <span class="font-semibold">已选中:</span>
          <span class="text-amber-600 font-medium">{{ selectedRows.length }}</span>
        </div>
      </div>
    </div>

    <!-- 模态框 -->
    <AddPlayerModal 
      v-if="showAddModal"
      @close="showAddModal = false"
      @submit="handleAddPlayer"
    />
    
    <BatchImportModal 
      v-if="showBatchImportModal"
      @close="showBatchImportModal = false"
      @submit="handleBatchImport"
    />
    
    <DeletePlayerModal 
      v-if="showDeleteModal"
      :player="deletingPlayer"
      @close="showDeleteModal = false"
      @confirm="handleDeletePlayer"
    />
  </div>
</template>

<script>
export { default } from './WhitelistGridTable.js'
</script>

<style>
@import './WhitelistGridTable.css';
</style>