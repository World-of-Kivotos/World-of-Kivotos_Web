import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { surveyApi, type GetSurveysParams } from '@/services/survey'
import type {
  CreateSurveyRequest,
  UpdateSurveyRequest,
  QuestionType,
  QuestionOption,
  QuestionValidation,
  QuestionRole,
  ConditionOperator,
  ConditionRule,
  QuestionCondition,
  ReorderSurveyItem,
} from '@/types/survey'
import { toast } from 'sonner'

/**
 * 问卷查询 key
 */
export const surveyKeys = {
  all: ['surveys'] as const,
  lists: () => [...surveyKeys.all, 'list'] as const,
  list: (params: GetSurveysParams) => [...surveyKeys.lists(), params] as const,
  details: () => [...surveyKeys.all, 'detail'] as const,
  detail: (id: number) => [...surveyKeys.details(), id] as const,
  stats: () => [...surveyKeys.all, 'stats'] as const,
  analytics: (id: number) => [...surveyKeys.all, 'analytics', id] as const,
}

/**
 * 获取问卷列表
 */
export function useSurveys(params?: GetSurveysParams) {
  return useQuery({
    queryKey: surveyKeys.list(params || {}),
    queryFn: () => surveyApi.getSurveys(params),
    staleTime: 30 * 1000, // 30秒内数据保持新鲜
  })
}

/**
 * 获取问卷详情
 */
export function useSurveyDetail(surveyId: number) {
  return useQuery({
    queryKey: surveyKeys.detail(surveyId),
    queryFn: () => surveyApi.getSurvey(surveyId),
    enabled: surveyId > 0,
    staleTime: 30 * 1000,
  })
}

/**
 * 更新问卷
 */
export function useUpdateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, data }: { surveyId: number; data: UpdateSurveyRequest }) =>
      surveyApi.updateSurvey(surveyId, data),
    onSuccess: () => {
      toast.success('问卷更新成功')
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: surveyKeys.details() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '更新问卷失败')
    },
  })
}

/**
 * 删除问卷
 */
export function useDeleteSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (surveyId: number) => surveyApi.deleteSurvey(surveyId),
    onSuccess: () => {
      toast.success('问卷删除成功')
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: surveyKeys.stats() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '删除问卷失败')
    },
  })
}

/**
 * 切换问卷启用状态
 */
export function useToggleSurveyActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, isActive }: { surveyId: number; isActive: boolean }) =>
      surveyApi.toggleSurveyActive(surveyId, isActive),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? '问卷已启用' : '问卷已禁用')
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: surveyKeys.details() })
      queryClient.invalidateQueries({ queryKey: surveyKeys.stats() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '操作失败')
    },
  })
}

/**
 * 置顶 / 取消置顶问卷
 */
export function useToggleSurveyTop() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ surveyId, isPinned }: { surveyId: number; isPinned: boolean }) =>
      surveyApi.updateSurvey(surveyId, { is_pinned: isPinned }),
    onSuccess: (_, variables) => {
      toast.success(variables.isPinned ? '已置顶' : '已取消置顶')
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '操作失败')
    },
  })
}

/**
 * 批量重排问卷展示顺序 (拖拽排序落库)
 */
export function useReorderSurveys() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orders: ReorderSurveyItem[]) => surveyApi.reorderSurveys(orders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '重排问卷失败')
    },
  })
}

/**
 * 复制问卷
 */
export function useDuplicateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (surveyId: number) => surveyApi.duplicateSurvey(surveyId),
    onSuccess: (result) => {
      toast.success(`已复制为「${result.title}」`)
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: surveyKeys.stats() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '复制问卷失败')
    },
  })
}

/**
 * 获取问卷统计分析 (逐题聚合较重, 仅在统计面板打开时才拉)
 */
export function useSurveyAnalytics(surveyId: number, enabled = true) {
  return useQuery({
    queryKey: surveyKeys.analytics(surveyId),
    queryFn: () => surveyApi.getAnalytics(surveyId),
    enabled: enabled && surveyId > 0,
    staleTime: 30 * 1000,
  })
}

/**
 * 获取问卷统计
 */
export function useSurveyStats() {
  return useQuery({
    queryKey: surveyKeys.stats(),
    queryFn: () => surveyApi.getStats(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

/**
 * 编辑器里的一条条件规则。
 * 形态与服务端 ConditionRule 一一对应, 只有 question_id 换成了目标依赖题的本地 _id
 * (新题此刻还没有服务端 id), 保存时统一解析为 question_id。
 */
export interface SaveConditionRule {
  question_id: string
  operator: ConditionOperator
  value?: string | number | string[]
}

export interface SaveCondition {
  action: 'show' | 'hide'
  match: 'all' | 'any'
  rules: SaveConditionRule[]
}

/**
 * 保存问卷编辑器里的一道题 (供 useSaveSurveyWithQuestions 内部使用)。
 * _id: 现有题为 `existing_<serverId>`, 新题为编辑器生成的随机串。
 */
export interface SaveQuestionInput {
  _id: string
  title: string
  description?: string
  type: QuestionType
  options?: QuestionOption[]
  is_required?: boolean
  is_pinned?: boolean
  validation?: QuestionValidation
  role?: QuestionRole
  condition?: SaveCondition
}

/**
 * 问卷基本信息与全部设置项, 原样透传给 create/update, 故字段名必须与后端 schema 一致。
 *
 * 刻意不含 is_active: 后端在 is_active=true 这一刻会校验"必须有一道可抽取的玩家名题",
 * 而保存流程是先 PATCH 基本信息再逐题增删, 此刻题目尚未落库, 带上它必然 400。
 * access_password 不是 Survey 的列, 后端只在 update_survey 里拦截并哈希。
 */
export type SaveSurveyBase = Omit<CreateSurveyRequest, 'questions'> &
  Pick<UpdateSurveyRequest, 'access_password'>

export interface SaveSurveyInput {
  surveyId: number | null // null=新建
  base: SaveSurveyBase
  questions: SaveQuestionInput[]
}

const EXISTING_PREFIX = 'existing_'

/**
 * 保存问卷（含题目的增量更新）。
 *
 * 替代旧的"删光重建": 按 question id 做增量 add/update/delete, 未改动的题保持原 id,
 * 其历史提交答案(按 question_id 关联)不再被级联删除。
 * 条件分支两段式落库: 先建/改所有题拿到服务端 id, 再把每条规则的 question_id
 * 从"目标题的本地 _id"解析为服务端 question_id 后回填。
 */
export function useSaveSurveyWithQuestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ surveyId, base, questions }: SaveSurveyInput) => {
      // 1. 建/改问卷基本信息 (新建不内联题目, 题目统一走下方增量)
      let sid: number
      if (surveyId == null) {
        const { access_password, ...createBase } = base
        const created = await surveyApi.createSurvey(createBase)
        sid = created.id
        // 口令不是 Survey 的列, 创建接口收不到它, 只能建完再 PATCH 一次交给 update_survey 哈希
        if (access_password) {
          await surveyApi.updateSurvey(sid, { access_password })
        }
      } else {
        sid = surveyId
        await surveyApi.updateSurvey(sid, base)
      }

      // 2. 现有题目集合 (仅编辑态)
      const current = surveyId != null ? await surveyApi.getSurvey(sid) : null
      const existingIds = new Set<number>(current?.questions.map((q) => q.id) ?? [])

      // 3. 第一遍: 逐题 新增/更新(暂不含 condition), 记录 本地_id -> 服务端 id
      const localToServer = new Map<string, number>()
      const keptServerIds = new Set<number>()
      for (const [index, q] of questions.entries()) {
        if (q._id.startsWith(EXISTING_PREFIX)) {
          const serverId = Number(q._id.slice(EXISTING_PREFIX.length))
          // 授权式更新: 可空字段传 null 显式清空 (后端 exclude_unset, 省略=不改)
          await surveyApi.updateQuestion(sid, serverId, {
            title: q.title.trim(),
            description: q.description ?? null,
            type: q.type,
            options: q.options ?? null,
            is_required: q.is_required ?? true,
            is_pinned: q.is_pinned ?? false,
            order: index,
            validation: q.validation ?? null,
            role: q.role ?? null,
          })
          localToServer.set(q._id, serverId)
          keptServerIds.add(serverId)
        } else {
          const createdQ = await surveyApi.addQuestion(sid, {
            title: q.title.trim(),
            description: q.description,
            type: q.type,
            options: q.options,
            is_required: q.is_required ?? true,
            is_pinned: q.is_pinned ?? false,
            order: index,
            validation: q.validation,
            role: q.role,
          })
          localToServer.set(q._id, createdQ.id)
        }
      }

      // 4. 删除本次移除的旧题 (其答案随之级联删除, 属预期)
      for (const serverId of existingIds) {
        if (!keptServerIds.has(serverId)) {
          await surveyApi.deleteQuestion(sid, serverId)
        }
      }

      // 5. 第二遍: 落条件 (此刻所有题都有服务端 id, 把目标本地 _id 解析为 question_id)
      for (const q of questions) {
        const isExisting = q._id.startsWith(EXISTING_PREFIX)
        // 新题若无条件, 创建时已是 null, 无需再 PATCH
        if (!q.condition && !isExisting) continue
        const selfId = localToServer.get(q._id)
        if (selfId == null) continue
        let resolved: QuestionCondition | null = null
        if (q.condition) {
          const rules: ConditionRule[] = []
          for (const rule of q.condition.rules) {
            const targetId = localToServer.get(rule.question_id)
            // 依赖题被删/不存在 -> 丢掉这条规则, 别把悬空 question_id 写进库
            if (targetId == null) continue
            rules.push({ question_id: targetId, operator: rule.operator, value: rule.value })
          }
          // 规则全部悬空等价于没配条件, 落 null 而不是空 rules, 免得后端按"空条件"再判一次
          resolved = rules.length > 0 ? { action: q.condition.action, match: q.condition.match, rules } : null
        }
        await surveyApi.updateQuestion(sid, selfId, { condition: resolved })
      }

      return { surveyId: sid }
    },
    onSuccess: () => {
      toast.success('问卷已保存')
      queryClient.invalidateQueries({ queryKey: surveyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: surveyKeys.details() })
      queryClient.invalidateQueries({ queryKey: surveyKeys.stats() })
    },
    onError: (error: Error) => {
      toast.error(error.message || '保存问卷失败')
    },
  })
}
