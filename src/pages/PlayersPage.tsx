import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Heart, MapPin, Gamepad2, Wifi, Clock, Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ItemIcon } from '@/components/ItemIcon'
import { useServerPlayers } from '@/hooks/useServer'
import { serverApi } from '@/services/server'
import type { PlayerItem, PlayerState } from '@/types/server'

function dim(d: string) {
  return d.replace('minecraft:', '')
}

function fmtTime(s: string) {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { hour12: false })
}

/** 从注册键派生可读名 (无 displayName 时): 去命名空间 + 下划线转空格 + 词首大写。 */
function itemLabel(it: PlayerItem) {
  if (it.displayName) return it.displayName
  const path = it.type.includes(':') ? it.type.slice(it.type.indexOf(':') + 1) : it.type
  return path.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** 耐久百分比 (0~1); 无耐久信息返回 null。 */
function durability(it: PlayerItem): number | null {
  if (it.maxDurability == null || it.maxDurability <= 0 || it.damage == null) return null
  return Math.max(0, Math.min(1, (it.maxDurability - it.damage) / it.maxDurability))
}

/** 物品 hover 文本: 名称 + 数量 + 耐久 + 附魔 (原生 title, 无 Tooltip 组件依赖)。 */
function itemTitle(it: PlayerItem) {
  const lines = [itemLabel(it)]
  lines.push(it.type)
  if (it.amount > 1) lines.push(`数量 ${it.amount}`)
  const dur = durability(it)
  if (dur != null && it.maxDurability != null && it.damage != null) {
    lines.push(`耐久 ${it.maxDurability - it.damage} / ${it.maxDurability} (${Math.round(dur * 100)}%)`)
  }
  if (it.enchantments) {
    for (const [k, lvl] of Object.entries(it.enchantments)) {
      lines.push(`${dim(k)} ${lvl}`)
    }
  }
  return lines.join('\n')
}

/** 单格物品: 图标 + 数量角标 + 耐久条 + 附魔标记 (左上角点)。空槽由调用方决定是否渲染。 */
function ItemSlot({ item }: { item: PlayerItem }) {
  const dur = durability(item)
  const enchanted = item.enchantments && Object.keys(item.enchantments).length > 0
  return (
    <div
      title={itemTitle(item)}
      className="relative flex aspect-square items-center justify-center rounded-md border bg-muted/40 p-1"
    >
      <ItemIcon id={item.type} count={item.amount} size={32} />
      {enchanted && (
        <Sparkles className="pointer-events-none absolute left-0.5 top-0.5 size-3 text-violet-400" />
      )}
      {dur != null && (
        <div className="pointer-events-none absolute inset-x-1 bottom-0.5 h-1 overflow-hidden rounded-full bg-black/30">
          <div
            className={
              dur > 0.5 ? 'h-full bg-success' : dur > 0.2 ? 'h-full bg-warning' : 'h-full bg-destructive'
            }
            style={{ width: `${dur * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

/** 空格占位 (盔甲/副手等固定布局位用; 主背包空槽直接不渲染)。 */
function EmptySlot({ label }: { label?: string }) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-md border border-dashed bg-muted/20 text-[10px] text-muted-foreground">
      {label}
    </div>
  )
}

const STATE_LABELS: { key: keyof PlayerState; label: string }[] = [
  { key: 'flying', label: '飞行中' },
  { key: 'allowFlight', label: '允许飞行' },
  { key: 'invulnerable', label: '无敌' },
  { key: 'sneaking', label: '潜行' },
  { key: 'sprinting', label: '疾跑' },
  { key: 'swimming', label: '游泳' },
  { key: 'gliding', label: '滑翔' },
]

const ARMOR_SLOTS: { slot: string; label: string }[] = [
  { slot: 'head', label: '头' },
  { slot: 'chest', label: '胸' },
  { slot: 'legs', label: '腿' },
  { slot: 'feet', label: '脚' },
]

/** 体征键值小行: 标签 + 等宽数字。 */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  )
}

/** tick -> 人类可读时长; >=20s 时舍秒, 大数显时分。 */
function fmtDuration(ticks: number) {
  if (ticks >= 1_000_000) return '永久'
  const sec = Math.round(ticks / 20)
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m}m${s ? ` ${s}s` : ''}`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
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

  // 点击在线列表的某玩家: 填入并触发查询, 滚到顶部让上方详情卡可见
  const openPlayer = (name: string) => {
    setNameInput(name)
    setQuery(name)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
              {p.location ? (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /><span className="font-mono tabular-nums">{dim(p.location.dimension)} {Math.round(p.location.x)},{Math.round(p.location.y)},{Math.round(p.location.z)}</span></div>
                    {p.vitals?.health != null && (
                      <div className="flex items-center gap-2"><Heart className="size-4 text-muted-foreground" /><span className="font-mono tabular-nums">{p.vitals.health.toFixed(0)}{p.vitals.maxHealth != null ? ` / ${p.vitals.maxHealth.toFixed(0)}` : ''}</span></div>
                    )}
                    {p.vitals?.level != null && (
                      <div className="flex items-center gap-2"><Gamepad2 className="size-4 text-muted-foreground" /><span className="font-mono tabular-nums">Lv.{p.vitals.level}</span></div>
                    )}
                    {p.online && p.ping != null ? (
                      <div className="flex items-center gap-2"><Wifi className="size-4 text-muted-foreground" /><span className="font-mono tabular-nums">{p.ping}ms</span></div>
                    ) : p.lastSaved ? (
                      <div className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" /><span className="font-mono text-xs tabular-nums">{fmtTime(p.lastSaved)}</span></div>
                    ) : null}
                  </div>
                  {!p.online && (
                    <p className="mt-3 text-xs text-muted-foreground">离线存档快照（玩家下线那刻的数据，非实时）</p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">离线玩家仅返回基本信息。</p>
              )}

              {(p.inventory || (p.enderChest && p.enderChest.length > 0) || (p.potionEffects && p.potionEffects.length > 0) || p.state || p.vitals) && (
                <Tabs defaultValue="inventory" className="mt-5">
                  <TabsList>
                    <TabsTrigger value="inventory">背包</TabsTrigger>
                    <TabsTrigger value="ender">末影箱</TabsTrigger>
                    <TabsTrigger value="effects">药水效果</TabsTrigger>
                    <TabsTrigger value="stats">体征/状态</TabsTrigger>
                  </TabsList>

                  <TabsContent value="inventory">
                    {p.inventory ? (
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">主背包</p>
                          {p.inventory.main.length > 0 ? (
                            <div className="grid grid-cols-9 gap-1.5">
                              {p.inventory.main.map((it) => (
                                <ItemSlot key={it.slot} item={it} />
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">空</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-6">
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">盔甲</p>
                            <div className="grid w-44 grid-cols-4 gap-1.5">
                              {ARMOR_SLOTS.map(({ slot, label }) => {
                                const it = p.inventory!.armor.find((a) => a.slot === slot)
                                return it ? <ItemSlot key={slot} item={it} /> : <EmptySlot key={slot} label={label} />
                              })}
                            </div>
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">副手</p>
                            <div className="w-11">
                              {p.inventory.offHand ? <ItemSlot item={p.inventory.offHand} /> : <EmptySlot />}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">无背包数据</p>
                    )}
                  </TabsContent>

                  <TabsContent value="ender">
                    {p.enderChest && p.enderChest.length > 0 ? (
                      <div className="grid grid-cols-9 gap-1.5">
                        {p.enderChest.map((it) => (
                          <ItemSlot key={it.slot} item={it} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">末影箱为空</p>
                    )}
                  </TabsContent>

                  <TabsContent value="effects">
                    {p.potionEffects && p.potionEffects.length > 0 ? (
                      <ul className="divide-y rounded-lg border">
                        {p.potionEffects.map((eff) => (
                          <li key={eff.type} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="flex items-center gap-2">
                              <span className="font-medium">{dim(eff.type).replace(/_/g, ' ')}</span>
                              {eff.amplifier > 0 && <Badge variant="outline" className="font-normal">Lv.{eff.amplifier + 1}</Badge>}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">{fmtDuration(eff.duration)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">无激活的药水效果</p>
                    )}
                  </TabsContent>

                  <TabsContent value="stats">
                    <div className="space-y-4">
                      {p.vitals && (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                          {p.vitals.health != null && <Stat label="生命" value={`${p.vitals.health.toFixed(1)}${p.vitals.maxHealth != null ? ` / ${p.vitals.maxHealth.toFixed(0)}` : ''}`} />}
                          {p.vitals.armor != null && <Stat label="护甲" value={p.vitals.armor} />}
                          {p.vitals.foodLevel != null && <Stat label="饱食度" value={`${p.vitals.foodLevel}${p.vitals.saturation != null ? ` (+${p.vitals.saturation.toFixed(1)})` : ''}`} />}
                          {p.vitals.level != null && <Stat label="经验等级" value={p.vitals.level} />}
                          {p.vitals.exp != null && <Stat label="本级进度" value={`${Math.round(p.vitals.exp * 100)}%`} />}
                          {p.vitals.totalExperience != null && <Stat label="总经验" value={p.vitals.totalExperience} />}
                          {p.vitals.remainingAir != null && <Stat label="氧气" value={`${p.vitals.remainingAir}${p.vitals.maximumAir != null ? ` / ${p.vitals.maximumAir}` : ' / 300'}`} />}
                          {p.vitals.fireTicks != null && p.vitals.fireTicks > 0 && <Stat label="燃烧" value={`${(p.vitals.fireTicks / 20).toFixed(1)}s`} />}
                        </div>
                      )}
                      {p.state && (
                        <div className="flex flex-wrap items-center gap-2">
                          {STATE_LABELS.filter(({ key }) => p.state![key] === true).map(({ key, label }) => (
                            <Badge key={key} variant="secondary" className="font-normal">{label}</Badge>
                          ))}
                          {(p.state.walkSpeed != null || p.state.flySpeed != null) && (
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                              {p.state.walkSpeed != null && `步速 ${p.state.walkSpeed.toFixed(2)}`}
                              {p.state.flySpeed != null && `  飞速 ${p.state.flySpeed.toFixed(2)}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
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
            <span className="ml-auto text-xs font-normal text-muted-foreground">点击玩家查看详情</span>
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
                    <TableRow
                      key={pl.uuid}
                      onClick={() => openPlayer(pl.name)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
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
