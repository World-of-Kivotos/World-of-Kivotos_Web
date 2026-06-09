import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Heart, MapPin, Gamepad2, Wifi } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useServerPlayers } from '@/hooks/useServer'
import { serverApi } from '@/services/server'

function dim(d: string) {
  return d.replace('minecraft:', '')
}

export function PlayersPage() {
  const online = useServerPlayers()
  const [nameInput, setNameInput] = useState('')
  const [query, setQuery] = useState('')

  const lookup = useQuery({
    queryKey: ['player', query],
    queryFn: () => serverApi.getPlayer(query),
    enabled: query.length > 0,
    retry: false,
    staleTime: 5 * 1000,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setQuery(nameInput.trim())
  }

  const p = lookup.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">在线玩家</h1>
        <p className="mt-1 text-sm text-muted-foreground">在线列表与玩家信息查询 · 15s 刷新</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">玩家查询</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="输入玩家名查询位置/状态…" className="pl-9" />
            </div>
            <Button type="submit" disabled={!nameInput.trim()}>查询</Button>
          </form>

          {query && lookup.isLoading && <p className="text-sm text-muted-foreground">查询中…</p>}
          {query && lookup.isError && <p className="text-sm text-muted-foreground">未找到玩家 {query} (不在线且无存档?)</p>}
          {p && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold">{p.playerName}</span>
                <Badge variant={p.online ? 'success' : 'secondary'}>{p.online ? '在线' : '离线'}</Badge>
                {p.gameMode && <Badge variant="outline" className="font-normal">{p.gameMode}</Badge>}
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{p.uuid}</p>
              {p.online ? (
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  {p.location && (
                    <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /><span className="font-mono tabular-nums">{dim(p.location.dimension)} {Math.round(p.location.x)},{Math.round(p.location.y)},{Math.round(p.location.z)}</span></div>
                  )}
                  {p.vitals?.health != null && (
                    <div className="flex items-center gap-2"><Heart className="size-4 text-muted-foreground" /><span className="font-mono tabular-nums">{p.vitals.health.toFixed(0)} / {p.vitals.maxHealth?.toFixed(0) ?? 20}</span></div>
                  )}
                  {p.vitals?.level != null && (
                    <div className="flex items-center gap-2"><Gamepad2 className="size-4 text-muted-foreground" /><span className="font-mono tabular-nums">Lv.{p.vitals.level}</span></div>
                  )}
                  {p.ping != null && (
                    <div className="flex items-center gap-2"><Wifi className="size-4 text-muted-foreground" /><span className="font-mono tabular-nums">{p.ping}ms</span></div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{p.note || '离线玩家仅返回基本信息。'}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            在线列表
            {online.data && <Badge variant="secondary">{online.data.count} / {online.data.maxPlayers}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>玩家</TableHead>
                  <TableHead>模式</TableHead>
                  <TableHead>维度</TableHead>
                  <TableHead>坐标</TableHead>
                  <TableHead className="text-right">Ping</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {online.isLoading ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">加载中…</TableCell></TableRow>
                ) : online.isError ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">无法获取 (服务器未连接?)</TableCell></TableRow>
                ) : !online.data || online.data.players.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">暂无在线玩家</TableCell></TableRow>
                ) : (
                  online.data.players.map((pl) => (
                    <TableRow key={pl.uuid}>
                      <TableCell className="font-medium">{pl.name}</TableCell>
                      <TableCell><Badge variant="outline" className="font-normal">{pl.gameMode}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dim(pl.dimension)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">{Math.round(pl.x)}, {Math.round(pl.y)}, {Math.round(pl.z)}</TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">{pl.ping}ms</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
