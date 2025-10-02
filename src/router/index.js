import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

// 路由组件懒加载
const LoginPage = () => import('../views/LoginPage.vue')
const ManagementPage = () => import('../views/ManagementPage.vue')
const WhitelistManagement = () => import('../views/WhitelistManagement.vue')
const ServerMonitor = () => import('../views/ServerMonitorPage.vue')

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: {
      requiresAuth: false,
      title: '登录 - World of Kivotos'
    }
  },
  {
    path: '/admin',
    name: 'Management',
    component: ManagementPage,
    meta: {
      requiresAuth: true,
      title: '管理面板 - World of Kivotos'
    },
    children: [
      {
        path: '',
        name: 'AdminDefault',
        redirect: '/admin/whitelist'
      },
      {
        path: 'whitelist',
        name: 'WhitelistManagement',
        component: WhitelistManagement,
        meta: {
          requiresAuth: true,
          title: '白名单管理 - World of Kivotos'
        }
      },
      {
        path: 'server',
        name: 'ServerMonitor',
        component: ServerMonitor,
        meta: {
          requiresAuth: true,
          title: '服务器监控 - World of Kivotos'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (authStore.isAuthenticated) {
      next()
    } else {
      next('/login')
    }
  } else {
    // 如果已登录且访问登录页，重定向到管理页
    if (to.name === 'Login' && authStore.isAuthenticated) {
      next('/admin')
    } else {
      next()
    }
  }
})

export default router