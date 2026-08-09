import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { WhitelistPage } from '@/pages/WhitelistPage'
import { MonitorPage } from '@/pages/MonitorPage'
import { PlayersPage } from '@/pages/PlayersPage'
import { LogsPage } from '@/pages/LogsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SurveyPage } from '@/pages/SurveyPage'
import { ReviewPage } from '@/pages/ReviewPage'
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

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
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
  component: DashboardPage,
})
const whitelistRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/whitelist',
  component: WhitelistPage,
})
const monitorRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/monitor',
  component: MonitorPage,
})
const playersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/players',
  component: PlayersPage,
})
const surveyRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/survey',
  component: () => <SurveyPage category="whitelist" />,
})
const formsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/forms',
  component: () => <SurveyPage category="collection" />,
})
const reviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/review',
  component: () => <ReviewPage category="whitelist" />,
})
// 收集表审核独立成页: 与进服申请混在一个队列里, 两边的待办会互相淹没
const formReviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/form-review',
  component: () => <ReviewPage category="collection" />,
})
const logsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/logs',
  component: LogsPage,
})
const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  appRoute.addChildren([
    indexRoute,
    dashboardRoute,
    whitelistRoute,
    monitorRoute,
    playersRoute,
    surveyRoute,
    formsRoute,
    reviewRoute,
    formReviewRoute,
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
