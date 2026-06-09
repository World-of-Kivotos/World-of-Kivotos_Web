import { useState, type FormEvent } from 'react'
import { Plus, Search, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { useWhitelist, useAddWhitelist, useDeleteWhitelist } from '@/hooks/useWhitelist'
import type { WhitelistEntry } from '@/types/whitelist'

const PAGE_SIZE = 20

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
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const list = useWhitelist({ page, size: PAGE_SIZE, search: search || undefined })
  const add = useAddWhitelist()
  const del = useDeleteWhitelist()

  const data = list.data
  const totalPages = data?.total_pages ?? 1

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
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
        onSuccess: () => {
          setAddOpen(false)
          setNewName('')
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">白名单</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `共 ${data.total} 名玩家` : '玩家白名单管理'}
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

          <div className="mt-4 rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>玩家名</TableHead>
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
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">加载中…</TableCell>
                  </TableRow>
                ) : list.isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">加载失败 (服务器未连接?)</TableCell>
                  </TableRow>
                ) : !data || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">暂无白名单</TableCell>
                  </TableRow>
                ) : (
                  data.items.map((entry: WhitelistEntry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {entry.uuid ? entry.uuid : <Badge variant="warning">待补全</Badge>}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-normal">{channelLabel(entry)}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.addedByName || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{fmtDate(entry.addedAt)}</TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">第 {data.page} / {totalPages} 页</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
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
    </div>
  )
}
