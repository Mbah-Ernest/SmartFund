'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'
import { cn, formatNaira } from '@/lib/utils'
import api from '@/lib/apiClient'

interface Budget {
  id: number
  categoryId: number
  categoryName: string
  amount: number
  period: string
}
interface Tracking { spent: number; remaining: number; isOverBudget: boolean }
interface Category { id: number; name: string; type: number }

function getBudgetStatus(spent: number, limit: number) {
  const pct = (spent / limit) * 100
  if (pct >= 100) return { status: 'over', text: 'Over Budget' }
  if (pct >= 80) return { status: 'warning', text: 'Near Limit' }
  return { status: 'healthy', text: 'Under Budget' }
}

function formatMonth(period: string) {
  try {
    const [year, month] = period.split('-').map(Number)
    return new Date(year, month - 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
  } catch {
    return period
  }
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<(Budget & { tracking?: Tracking })[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({ categoryId: '', amount: '' })

  const loadBudgets = async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/personal-budgets')
      const list: Budget[] = r.data ?? []
      const withTracking = await Promise.all(
        list.map(async b => {
          try {
            const t = await api.get(`/api/personal-budgets/${b.id}/tracking`)
            return { ...b, tracking: t.data }
          } catch {
            return { ...b, tracking: { spent: 0, remaining: b.amount, isOverBudget: false } }
          }
        })
      )
      setBudgets(withTracking)
    } catch {
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBudgets()
    api.get('/api/personal-categories').then(r => setCategories(r.data ?? [])).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.categoryId || !formData.amount) return
    setSubmitting(true)
    try {
      await api.post('/api/personal-budgets', {
        categoryId: parseInt(formData.categoryId),
        amount: parseFloat(formData.amount),
        period: new Date().toISOString().slice(0, 7),
      })
      setFormData({ categoryId: '', amount: '' })
      await loadBudgets()
    } catch {
      alert('Failed to create budget. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Group by period
  const grouped: Record<string, typeof budgets> = {}
  for (const b of budgets) {
    const key = b.period ?? 'Unknown'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(b)
  }
  const sortedPeriods = Object.keys(grouped).sort().reverse()

  const expenseCategories = categories.filter(c => c.type === 1)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
        <p className="text-muted-foreground">Set monthly spending limits and track your progress</p>
      </div>

      {/* Create Budget Form */}
      <Card className="glass mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Create New Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <Field className="flex-1">
              <FieldLabel>Category</FieldLabel>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData(prev => ({ ...prev, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field className="flex-1">
              <FieldLabel>Monthly Limit (NGN)</FieldLabel>
              <Input
                type="number"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                min="0"
                step="1000"
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={!formData.categoryId || !formData.amount || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" />Add Budget</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Budget List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No budgets yet. Create one above.</p>
      ) : (
        <div className="space-y-8">
          {sortedPeriods.map(period => (
            <div key={period}>
              <h2 className="text-lg font-semibold mb-4">{formatMonth(period)}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {grouped[period].map(budget => {
                  const spent = budget.tracking?.spent ?? 0
                  const remaining = budget.tracking?.remaining ?? budget.amount
                  const percentage = Math.min((spent / budget.amount) * 100, 100)
                  const { status, text } = getBudgetStatus(spent, budget.amount)

                  return (
                    <Card key={budget.id} className="glass">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{budget.categoryName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatNaira(spent)} of {formatNaira(budget.amount)}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "shrink-0",
                              status === 'over' && "bg-destructive/20 text-destructive",
                              status === 'warning' && "bg-warning/20 text-warning",
                              status === 'healthy' && "bg-success/20 text-success"
                            )}
                          >
                            {text}
                          </Badge>
                        </div>
                        <Progress
                          value={percentage}
                          className={cn(
                            "h-2 mb-4",
                            status === 'over' && "[&>[data-slot=indicator]]:bg-destructive",
                            status === 'warning' && "[&>[data-slot=indicator]]:bg-warning",
                            status === 'healthy' && "[&>[data-slot=indicator]]:bg-success"
                          )}
                        />
                        <span className={cn(
                          "text-sm font-medium",
                          status === 'over' && "text-destructive",
                          status === 'warning' && "text-warning",
                          status === 'healthy' && "text-success"
                        )}>
                          {remaining >= 0 ? `${formatNaira(remaining)} remaining` : `${formatNaira(Math.abs(remaining))} over`}
                        </span>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
