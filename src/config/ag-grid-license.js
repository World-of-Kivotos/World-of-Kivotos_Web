// AG Grid Enterprise License Configuration
// 请在环境变量中设置您的AG Grid企业版许可证密钥
// 或者在此文件中直接设置（不推荐用于生产环境）

import { LicenseManager } from 'ag-grid-enterprise'

// 从环境变量获取许可证密钥
const AG_GRID_LICENSE_KEY = import.meta.env.VITE_AG_GRID_LICENSE_KEY

// 如果没有环境变量，可以在这里直接设置（仅用于开发）
// const AG_GRID_LICENSE_KEY = 'your-license-key-here'

export const initializeAGGridLicense = () => {
  if (AG_GRID_LICENSE_KEY) {
    LicenseManager.setLicenseKey(AG_GRID_LICENSE_KEY)
    console.log('AG Grid Enterprise license initialized')
  } else {
    console.warn('AG Grid Enterprise license key not found. Please set VITE_AG_GRID_LICENSE_KEY environment variable.')
    console.warn('Visit https://www.ag-grid.com/vue-data-grid/license-install/ for more information.')
  }
}

export default {
  initializeAGGridLicense
}