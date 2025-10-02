import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import './styles/modal-transitions.css'
import App from './App.vue'
import { initializeAGGridLicense } from './config/ag-grid-license.js'

// AG Grid 模块注册
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'

// 注册所有模块
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

// 初始化 AG Grid 企业版许可证
initializeAGGridLicense()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')