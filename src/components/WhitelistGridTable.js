import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import { useWhitelistStore } from '../stores/whitelist.js'
import { useAuthStore } from '../stores/auth.js'
import AddPlayerModal from './modals/AddPlayerModal.vue'
import BatchImportModal from './modals/BatchImportModal.vue'
import DeletePlayerModal from './modals/DeletePlayerModal.vue'

export default {
  name: 'WhitelistGridTable',
  components: {
    AgGridVue,
    AddPlayerModal,
    BatchImportModal,
    DeletePlayerModal
  },
  setup() {
    const whitelistStore = useWhitelistStore()
    const authStore = useAuthStore()
    
    // 响应式数据
    const agGrid = ref(null)
    const gridApi = ref(null)
    const columnApi = ref(null)
    const rowData = ref([])
    const selectedRows = ref([])
    const isLoading = ref(false)
    
    // 模态框状态
    const showAddModal = ref(false)
    const showBatchImportModal = ref(false)
    const showDeleteModal = ref(false)
    const deletingPlayer = ref(null)

    // 列定义 - 调整顺序:玩家名称、添加人、UUID、添加时间、最后更新、备注、状态(默认隐藏)、操作
    const columnDefs = ref([
      {
        headerName: '玩家名称',
        field: 'name',
        width: 200,
        minWidth: 120,
        pinned: 'left', // 固定在左侧
        cellRenderer: (params) => {
          return `
            <div class="flex items-center gap-2">
              <div class="avatar placeholder">
                <div class="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
                  <span class="text-xs font-semibold">${params.value ? params.value.charAt(0).toUpperCase() : '?'}</span>
                </div>
              </div>
              <span class="font-medium text-gray-900">${params.value || '未知'}</span>
            </div>
          `
        },
        sortable: true,
        filter: 'agTextColumnFilter',
        filterParams: {
          filterOptions: ['contains', 'startsWith', 'endsWith'],
          suppressAndOrCondition: true
        }
      },
      {
        headerName: '添加人',
        field: 'addedByName',
        width: 150,
        minWidth: 100,
        cellRenderer: (params) => {
          const addedBy = params.value || 'System'
          const isSystem = addedBy === 'System' || addedBy === 'SYSTEM' || addedBy === 'ADMIN'
          const badgeClass = isSystem ? 'badge-info' : 'badge-success'
          return `
            <div class="flex items-center gap-2">
              <div class="badge ${badgeClass} badge-sm">
                ${addedBy}
              </div>
            </div>
          `
        },
        sortable: true,
        filter: 'agTextColumnFilter',
        filterParams: {
          filterOptions: ['contains', 'equals', 'startsWith'],
          defaultOption: 'contains'
        }
      },
      {
        headerName: 'UUID',
        field: 'uuid',
        width: 300,
        minWidth: 200,
        cellRenderer: (params) => {
          return `
            <div class="font-mono text-sm text-gray-600">
              ${params.value || '待补充'}
            </div>
          `
        },
        sortable: true,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: '添加时间',
        field: 'createdAt',
        width: 140,
        minWidth: 120,
        cellRenderer: (params) => {
          if (!params.value) return ''
          const date = new Date(params.value)
          return `
            <div class="text-sm text-gray-600">
              ${date.toLocaleDateString('zh-CN')}
              <br>
              <span class="text-xs text-gray-500">${date.toLocaleTimeString('zh-CN')}</span>
            </div>
          `
        },
        sortable: true,
        filter: 'agDateColumnFilter',
        filterParams: {
          comparator: (filterLocalDateAtMidnight, cellValue) => {
            const cellDate = new Date(cellValue)
            if (cellDate < filterLocalDateAtMidnight) return -1
            if (cellDate > filterLocalDateAtMidnight) return 1
            return 0
          }
        }
      },
      {
        headerName: '最后更新',
        field: 'updatedAt',
        width: 140,
        minWidth: 120,
        cellRenderer: (params) => {
          if (!params.value) return ''
          const date = new Date(params.value)
          return `
            <div class="text-sm text-gray-600">
              ${date.toLocaleDateString('zh-CN')}
              <br>
              <span class="text-xs text-gray-500">${date.toLocaleTimeString('zh-CN')}</span>
            </div>
          `
        },
        sortable: true,
        filter: 'agDateColumnFilter'
      },
      {
        headerName: '备注',
        field: 'notes',
        width: 180,
        minWidth: 100,
        editable: true,
        cellEditor: 'agTextCellEditor',
        cellRenderer: (params) => {
          return `
            <div class="text-sm text-gray-600 truncate cursor-text" title="双击编辑备注">
              ${params.value || '-'}
            </div>
          `
        },
        sortable: true,
        filter: 'agTextColumnFilter'
      },
      {
        headerName: '状态',
        field: 'isActive',
        width: 100,
        minWidth: 80,
        hide: true, // 默认隐藏
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: [true, false]
        },
        valueFormatter: (params) => params.value !== false ? '正常' : '封禁',
        cellRenderer: (params) => {
          const isEnabled = params.value !== false
          return `
            <div class="badge ${isEnabled ? 'badge-success' : 'badge-error'} badge-sm cursor-pointer" title="点击修改状态">
              ${isEnabled ? '正常' : '封禁'}
            </div>
          `
        },
        sortable: true,
        filter: 'agSetColumnFilter',
        filterParams: {
          values: [true, false],
          valueFormatter: (params) => params.value === true ? '正常' : '封禁'
        }
      },
      {
        headerName: '操作',
        field: 'actions',
        width: 120,
        minWidth: 100,
        suppressHeaderMenuButton: true,
        sortable: false,
        filter: false,
        cellRenderer: (params) => {
          return `
            <div class="flex gap-2 justify-center">
              <button class="btn btn-sm bg-red-50 hover:bg-red-100 text-red-600 border-0 delete-btn" title="删除">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          `
        },
        onCellClicked: (params) => {
          const target = params.event.target
          if (target.closest('.delete-btn')) {
            deletePlayer(params.data)
          }
        }
      }
    ])

    // 默认列配置
    const defaultColDef = ref({
      sortable: true,
      filter: true,
      resizable: true,
      suppressAutoSize: true,
      suppressSizeToFit: false,
      menuTabs: ['filterMenuTab', 'generalMenuTab'],
      filterParams: {
        debounceMs: 200
      }
    })

    // Grid 选项
    const gridOptions = ref({
      rowSelection: {
        mode: 'multiRow',
        checkboxes: true,
        headerCheckbox: true,
        enableClickSelection: false
      },
      cellSelection: {
        handle: {
          mode: 'range'
        }
      },
      undoRedoCellEditing: true,
      undoRedoCellEditingLimit: 20,
      suppressMenuHide: true,
      suppressMovableColumns: false,
      suppressDragLeaveHidesColumns: true,
      animateRows: true,
      rowHeight: 56,
      headerHeight: 44,
      pagination: true,
      paginationPageSize: 50,
      paginationAutoPageSize: false,
      getRowId: (params) => {
        // 确保返回字符串类型
        const id = params.data.uuid || params.data.id
        return id ? String(id) : undefined
      },
      sideBar: {
        toolPanels: [
          {
            id: 'columns',
            labelDefault: '列',
            labelKey: 'columns',
            iconKey: 'columns',
            toolPanel: 'agColumnsToolPanel',
            toolPanelParams: {
              suppressRowGroups: true,
              suppressValues: true,
              suppressPivots: true,
              suppressPivotMode: true,
              suppressColumnFilter: false,
              suppressColumnSelectAll: false,
              suppressColumnExpandAll: false
            }
          },
          {
            id: 'filters',
            labelDefault: '筛选',
            labelKey: 'filters',
            iconKey: 'filter',
            toolPanel: 'agFiltersToolPanel'
          }
        ],
        defaultToolPanel: 'columns'
      },
      statusBar: {
        statusPanels: [
          {
            statusPanel: 'agSelectedRowCountComponent',
            align: 'left'
          },
          {
            statusPanel: 'agAggregationComponent'
          }
        ]
      }
    })

    // 计算属性
    const totalCount = computed(() => rowData.value.length)
    const enabledCount = computed(() => rowData.value.filter(row => row.isActive !== false).length)
    const disabledCount = computed(() => rowData.value.filter(row => row.isActive === false).length)

    // 本地存储键名
    const COLUMN_STATE_KEY = 'whitelist-grid-column-state'
    const FILTER_STATE_KEY = 'whitelist-grid-filter-state'

    // 保存列状态到 localStorage
    const saveColumnState = () => {
      if (gridApi.value) {
        const columnState = gridApi.value.getColumnState()
        localStorage.setItem(COLUMN_STATE_KEY, JSON.stringify(columnState))
        console.log('列状态已保存:', columnState)
      }
    }

    // 恢复列状态从 localStorage
    const restoreColumnState = () => {
      const savedState = localStorage.getItem(COLUMN_STATE_KEY)
      if (savedState && gridApi.value) {
        try {
          const columnState = JSON.parse(savedState)
          gridApi.value.applyColumnState({ state: columnState, applyOrder: true })
          console.log('列状态已恢复:', columnState)
        } catch (error) {
          console.error('恢复列状态失败:', error)
        }
      }
    }

    // 保存筛选状态
    const saveFilterState = () => {
      if (gridApi.value) {
        const filterState = gridApi.value.getFilterModel()
        localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(filterState))
      }
    }

    // 恢复筛选状态
    const restoreFilterState = () => {
      const savedState = localStorage.getItem(FILTER_STATE_KEY)
      if (savedState && gridApi.value) {
        try {
          const filterState = JSON.parse(savedState)
          gridApi.value.setFilterModel(filterState)
        } catch (error) {
          console.error('恢复筛选状态失败:', error)
        }
      }
    }

    // 重置列状态
    const resetColumnState = () => {
      localStorage.removeItem(COLUMN_STATE_KEY)
      localStorage.removeItem(FILTER_STATE_KEY)
      if (gridApi.value) {
        gridApi.value.resetColumnState()
        gridApi.value.setFilterModel(null)
      }
      console.log('列状态已重置')
    }

    // 事件处理
    const onGridReady = (params) => {
      console.log('AG Grid 初始化完成')
      gridApi.value = params.api
      columnApi.value = params.columnApi
      
      console.log('列定义数量:', columnDefs.value.length)
      console.log('Grid API:', gridApi.value)
      
      // 加载所有数据（使用较大的页面大小）
      loadData()
      
      // 恢复列状态
      setTimeout(() => {
        restoreColumnState()
        restoreFilterState()
      }, 100)
    }

    // 监听列状态变化并保存
    const onColumnMoved = () => {
      saveColumnState()
    }

    const onColumnResized = (params) => {
      if (params.finished) {
        saveColumnState()
      }
    }

    const onColumnVisible = () => {
      saveColumnState()
    }

    const onColumnPinned = () => {
      saveColumnState()
    }

    const onSortChanged = () => {
      saveColumnState()
    }

    const onFilterChanged = () => {
      saveFilterState()
    }

    const onSelectionChanged = (event) => {
      selectedRows.value = event.api.getSelectedRows()
    }

    const onCellValueChanged = (event) => {
      // 处理单元格编辑
      handleCellEdit(event.data, event.colDef.field, event.newValue)
    }

    // 数据操作
    const loadData = async () => {
      isLoading.value = true
      try {
        // 后端现在返回所有数据，前端处理分页
        await whitelistStore.fetchWhitelist()
        rowData.value = whitelistStore.whitelist
        console.log('AG Grid 数据加载完成:', rowData.value)
        console.log('数据数量:', rowData.value.length)
        if (rowData.value.length > 0) {
          console.log('第一条数据示例:', rowData.value[0])
        }
      } catch (error) {
        console.error('加载白名单数据失败:', error)
      } finally {
        isLoading.value = false
      }
    }

    const refreshData = async () => {
      await loadData()
    }



    // 玩家操作
    const deletePlayer = (player) => {
      deletingPlayer.value = player
      showDeleteModal.value = true
    }

    const handleDeletePlayer = async (player) => {
      try {
        await whitelistStore.deletePlayer(player)
        await refreshData()
        showDeleteModal.value = false
        deletingPlayer.value = null
      } catch (error) {
        console.error('删除玩家失败:', error)
      }
    }

    const deleteSelectedRows = async () => {
      if (selectedRows.value.length === 0) return
      
      if (confirm(`确定要删除选中的 ${selectedRows.value.length} 个玩家吗？`)) {
        try {
          for (const player of selectedRows.value) {
            await whitelistStore.deletePlayer(player)
          }
          await refreshData()
          selectedRows.value = []
        } catch (error) {
          console.error('批量删除失败:', error)
        }
      }
    }

    const handleAddPlayer = async (playerData) => {
      try {
        // 必须登录才能添加
        if (!authStore.isAuthenticated || !authStore.userInfo.username) {
          console.error('未登录,无法添加玩家')
          return
        }
        
        // 重置自动登出定时器
        authStore.resetAutoLogoutTimer()
        
        const result = await whitelistStore.addPlayer(playerData, authStore.userInfo.username)
        
        if (result.success) {
          // 只刷新一次数据
          await refreshData()
          showAddModal.value = false
        } else {
          console.error('添加玩家失败:', result.error)
        }
      } catch (error) {
        console.error('添加玩家失败:', error)
      }
    }

    const handleBatchImport = async (players) => {
      try {
        // 必须登录才能批量导入
        if (!authStore.isAuthenticated || !authStore.userInfo.username) {
          console.error('未登录,无法批量导入')
          return
        }
        
        // 重置自动登出定时器
        authStore.resetAutoLogoutTimer()
        
        const result = await whitelistStore.batchAddPlayers(players, authStore.userInfo.username)
        
        if (result.success) {
          // 只刷新一次数据
          await refreshData()
          showBatchImportModal.value = false
        } else {
          console.error('批量导入失败:', result.error)
        }
      } catch (error) {
        console.error('批量导入失败:', error)
      }
    }

    const handleCellEdit = async (player, field, newValue) => {
      try {
        const updateData = { [field]: newValue }
        await whitelistStore.updatePlayer(player.uuid, updateData)
      } catch (error) {
        console.error('更新玩家信息失败:', error)
        // 刷新数据以回滚更改
        await refreshData()
      }
    }

    // 监听筛选变化
    return {
      // 引用
      agGrid,
      
      // 数据
      rowData,
      selectedRows,
      isLoading,
      
      // 模态框
      showAddModal,
      showBatchImportModal,
      showDeleteModal,
      deletingPlayer,
      
      // 配置
      columnDefs,
      defaultColDef,
      gridOptions,
      
      // 计算属性
      totalCount,
      enabledCount,
      disabledCount,
      
      // 方法
      onGridReady,
      onSelectionChanged,
      onCellValueChanged,
      onColumnMoved,
      onColumnResized,
      onColumnVisible,
      onColumnPinned,
      onSortChanged,
      onFilterChanged,
      refreshData,
      deleteSelectedRows,
      resetColumnState,
      handleAddPlayer,
      handleBatchImport,
      handleDeletePlayer
    }
  }
}