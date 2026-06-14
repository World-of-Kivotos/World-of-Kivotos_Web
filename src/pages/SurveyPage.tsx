import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { SurveyEditModal } from '@/components/SurveyEditModal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useSurveys, useToggleSurveyActive } from '@/hooks/useSurvey'

// 问卷管理: 仅负责问卷本身的增改与启停; 玩家提交审核已独立到「问卷审核」页 (ReviewPage)。
export function SurveyPage() {
  const surveys = useSurveys({ size: 50 })
  const toggle = useToggleSurveyActive()
  const [editorOpen, setEditorOpen] = useState(false)
  // null = 新建模式; number = 编辑该问卷。编辑器自带详情拉取与保存, 这里只管开关与目标 id。
  const [editingId, setEditingId] = useState<number | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setEditorOpen(true)
  }
  const openEdit = (id: number) => {
    setEditingId(id)
    setEditorOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">问卷管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">编辑与启停问卷</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus /> 新建问卷
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>识别码</TableHead>
                  <TableHead>题数</TableHead>
                  <TableHead>提交数</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.isLoading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">加载中…</TableCell></TableRow>
                ) : surveys.isError ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">加载失败 (问卷服务未连接?)</TableCell></TableRow>
                ) : !surveys.data || surveys.data.items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">暂无问卷</TableCell></TableRow>
                ) : (
                  surveys.data.items.map((sv) => (
                    <TableRow key={sv.id}>
                      <TableCell className="font-medium">{sv.title}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{sv.code}</TableCell>
                      <TableCell className="font-mono tabular-nums">{sv.question_count}</TableCell>
                      <TableCell className="font-mono tabular-nums">{sv.submission_count}</TableCell>
                      <TableCell>{sv.is_active ? <Badge variant="success">启用</Badge> : <Badge variant="secondary">停用</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(sv.id)}>
                            <Pencil /> 编辑
                          </Button>
                          <Button variant="outline" size="sm" disabled={toggle.isPending} onClick={() => toggle.mutate({ surveyId: sv.id, isActive: !sv.is_active })}>
                            {sv.is_active ? '停用' : '启用'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <SurveyEditModal open={editorOpen} onOpenChange={setEditorOpen} surveyId={editingId} />
    </div>
  )
}
