import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { Placeholder } from '@/components/Placeholder'
import { LoginPage } from '@/pages/LoginPage'
import { Toaster } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

// 受保护布局路由 (pathless): 进入前校验登录态, 未登录跳 /login
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: () => {
    if (!useAuthStore.getState().checkAuth()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})

// P1 阶段各业务页先用 Placeholder, P2-P5 逐页替换为真实实现
const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: () => <Placeholder title="概览" description="白名单统计、服务器性能快照、最近操作日志" />,
})
const whitelistRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/whitelist',
  component: () => <Placeholder title="白名单" description="玩家白名单增删查、批量、同步" />,
})
const monitorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/monitor',
  component: () => <Placeholder title="服务器监控" description="TPS / MSPT / CPU / 内存 / 线程" />,
})
const playersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/players',
  component: () => <Placeholder title="在线玩家" description="在线玩家列表与玩家信息查询" />,
})
const surveyRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/survey',
  component: () => <Placeholder title="问卷管理" description="问卷编辑、提交审核" />,
})
const logsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/logs',
  component: () => <Placeholder title="操作日志" description="白名单操作与未授权访问审计" />,
})
const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: () => <Placeholder title="设置" description="API 令牌、管理员、主题" />,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    indexRoute,
    dashboardRoute,
    whitelistRoute,
    monitorRoute,
    playersRoute,
    surveyRoute,
    logsRoute,
    settingsRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
