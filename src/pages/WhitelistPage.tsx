import { useState, type FormEvent } from 'react'
import { Plus, Search, RefreshCw, Trash2, Copy, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  useWhitelist, useAddWhitelist, useDeleteWhitelist,
  useSetWhitelistActive, useBatchOperation, useResetPlayerAuth,
} from '@/hooks/useWhitelist'
import type { WhitelistEntry, AddWhitelistResult } from '@/types/whitelist'

const PAGE_SIZE_OPTIONS = [20, 50, 100]
// 表格总列数 (选择框 + 6 个数据列 + 操作), 用于空/加载态占位单元格的 colSpan
const COL_COUNT = 8

function fmtDate(s?: string) {
  if (!s) return '—'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { hour12: false })
}

// 派生"添加渠道": PLAYER/SYSTEM 为玩家自助注册; 否则按 addedByUuid 标记区分
// (mod 端: WEBUI=网页后台, CONSOLE=终端, 真实玩家 uuid=游戏内命令, API/空=程序调用)
function channelLabel(entry: WhitelistEntry): string {
  if (entry.source === 'PLAYER' || entry.source === 'SYSTEM') return '自助注册'
  const u = entry.addedByUuid
  if (u === 'WEBUI') return '网页'
  if (u === 'CONSOLE') return '终端'
  if (!u || u === 'API' || u === '00000000-0000-0000-0000-000000000000') return '程序'
  if (/^[0-9a-fA-F-]{36}$/.test(u)) return '游戏内'
  return '程序'
}

export function WhitelistPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [issued, setIssued] = useState<AddWhitelistResult | null>(null)
  // 选中行 id 集合 (供批量启用/禁用)。翻页/改页大小/搜索时清空, 避免跨页误操作
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const list = useWhitelist({ page, size: pageSize, search: search || undefined })
  const add = useAddWhitelist()
  const del = useDeleteWhitelist()
  const setActive = useSetWhitelistActive()
  const batch = useBatchOperation()
  const resetAuth = useResetPlayerAuth()

  const data = list.data
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.total_pages ?? 1

  const clearSelection = () => setSelected(new Set())

  const goPage = (p: number) => {
    setPage(p)
    clearSelection()
  }

  const changePageSize = (n: number) => {
    setPageSize(n)
    setPage(1)
    clearSelection()
  }

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
    clearSelection()
  }

  // 当前页全选状态 (三态: 全选 / 部分 / 未选)
  const allChecked = items.length > 0 && items.every((e) => selected.has(e.id))
  const someChecked = items.some((e) => selected.has(e.id))
  const headerCheckState: boolean | 'indeterminate' = allChecked ? true : someChecked ? 'indeterminate' : false

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (items.length > 0 && items.every((e) => prev.has(e.id))) {
        items.forEach((e) => next.delete(e.id))
      } else {
        items.forEach((e) => next.add(e.id))
      }
      return next
    })
  }

  const selectedNames = items.filter((e) => selected.has(e.id)).map((e) => e.name)

  const runBatch = (op: 'enable' | 'disable') => {
    if (selectedNames.length === 0) return
    batch.mutate(
      { operation: op, players: selectedNames.map((name) => ({ name })) },
      { onSuccess: () => clearSelection() }
    )
  }

  const submitAdd = (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      toast.error('请输入玩家名')
      return
    }
    add.mutate(
      { name, source: 'ADMIN' },
      {
        onSuccess: (data) => {
          setAddOpen(false)
          setNewName('')
          // 后端在玩家认证启用时回传一次性注册码, 弹窗展示给管理员转交玩家
          if (data?.registration_code) {
            setIssued(data)
          }
        },
      }
    )
  }

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => toast.success('注册码已复制'),
      () => toast.error('复制失败, 请手动选择')
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">白名单</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `共 ${total} 名玩家` : '玩家白名单管理'}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus /> 添加玩家
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <form onSubmit={submitSearch} className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="按玩家名搜索…"
                className="pl-9"
              />
            </form>
            <Button variant="outline" size="icon" onClick={() => list.refetch()} aria-label="刷新">
              <RefreshCw className={list.isFetching ? 'animate-spin' : ''} />
            </Button>
          </div>

          {/* 批量操作工具栏: 有选中项时出现 */}
          {selected.size > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2">
              <span className="text-sm text-muted-foreground">已选 {selected.size} 项</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={batch.isPending} onClick={() => runBatch('enable')}>
                  批量启用
                </Button>
                <Button variant="outline" size="sm" disabled={batch.isPending} onClick={() => runBatch('disable')}>
                  批量禁用
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>取消选择</Button>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={headerCheckState}
                      onCheckedChange={toggleAll}
                      aria-label="全选本页"
                      disabled={items.length === 0}
                    />
                  </TableHead>
                  <TableHead>玩家名</TableHead>
                  <TableHead>QQ</TableHead>
                  <TableHead>UUID</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>添加者</TableHead>
                  <TableHead>添加时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={COL_COUNT} className="py-10 text-center text-sm text-muted-foreground">加载中…</TableCell>
                  </TableRow>
                ) : list.isError ? (
                  <TableRow>
                    <TableCell colSpan={COL_COUNT} className="py-10 text-center text-sm text-muted-foreground">加载失败 (服务器未连接?)</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COL_COUNT} className="py-10 text-center text-sm text-muted-foreground">暂无白名单</TableCell>
                  </TableRow>
                ) : (
                  items.map((entry: WhitelistEntry) => (
                    <TableRow key={entry.id} className={entry.isActive ? undefined : 'opacity-60'}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(entry.id)}
                          onCheckedChange={() => toggleOne(entry.id)}
                          aria-label={`选择 ${entry.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {entry.name}
                          {!entry.isActive && (
                            <Badge variant="outline" className="border-destructive/40 font-normal text-destructive">已禁用</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.qq || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {entry.uuid || '—'}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-normal">{channelLabel(entry)}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.addedByName || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{fmtDate(entry.addedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-3">
                          {/* 启用/禁用开关: 关闭后该玩家进服会被拒并提示"管理员已关闭访问权限" */}
                          <Switch
                            checked={entry.isActive}
                            onCheckedChange={(v) => setActive.mutate({ name: entry.name, isActive: v })}
                            aria-label={entry.isActive ? `禁用 ${entry.name}` : `启用 ${entry.name}`}
                          />
                          {/* 重置密码与免密: 清认证记录 + 吊销设备绑定, 白名单资格不受影响。
                              只禁用正在重置的那一行 —— mutation 实例为整表共用, 按 isPending 一刀切会锁住所有行 */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="text-muted-foreground hover:text-foreground"
                                disabled={resetAuth.isPending && resetAuth.variables === entry.name}
                                aria-label={`重置 ${entry.name} 的密码与免密`}
                              >
                                <KeyRound />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>重置密码与免密</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定重置 <span className="font-medium text-foreground">{entry.name}</span> 的登录凭据?
                                  该玩家的密码记录将被清除, 已登记的免密设备将被吊销 —— 需重新
                                  <code className="mx-1 rounded bg-muted px-1">/register</code>设置密码,
                                  并重新<code className="mx-1 rounded bg-muted px-1">/enroll</code>才能恢复免密登录。
                                  白名单资格不受影响; 若该玩家在线, 会被原地冻结并提示重新注册。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction onClick={() => resetAuth.mutate(entry.name)}>
                                  重置
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label="删除">
                                <Trash2 />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>移除白名单</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定将 <span className="font-medium text-foreground">{entry.name}</span> 移出白名单? 该玩家将无法进入服务器。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => del.mutate(entry.name)}
                                >
                                  移除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页: 每页条数选择 + 翻页 + 页数统计 */}
          {data && total > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>共 {total} 条</span>
                <Select value={String(pageSize)} onValueChange={(v) => changePageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} 条/页</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">第 {data.page} / {totalPages} 页</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>上一页</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>下一页</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加白名单玩家</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newName">玩家名</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="3-16 位字母数字下划线"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">UUID 将在玩家首次登录时自动补全。</p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">取消</Button>
              </DialogClose>
              <Button type="submit" disabled={add.isPending}>{add.isPending ? '添加中…' : '添加'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={issued !== null} onOpenChange={(o) => { if (!o) setIssued(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注册码已生成</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              已添加 <span className="font-medium text-foreground">{issued?.name}</span> 到白名单。请将下方注册码转交该玩家,
              用于游戏内 <code className="rounded bg-muted px-1">/register &lt;密码&gt; &lt;确认&gt; &lt;注册码&gt;</code>。
              <strong className="text-foreground">一次性, 仅限该用户名</strong>
              {issued?.code_expires_minutes ? `, ${Math.round(issued.code_expires_minutes / 60)} 小时内有效` : ''}。
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={issued?.registration_code ?? ''} className="font-mono text-base tracking-widest" />
              <Button
                type="button" variant="outline" size="icon" aria-label="复制注册码"
                onClick={() => issued?.registration_code && copyCode(issued.registration_code)}
              >
                <Copy />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              关闭后无法再次查看完整注册码 (后端仅存哈希)。如遗失, 可在游戏内用 /accesshub auth gencode &lt;玩家&gt; 重新生成。
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">完成</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
