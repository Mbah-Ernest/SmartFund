'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNaira } from '@/lib/utils'
import api from '@/lib/apiClient'

interface Budget {
  id: number
  categoryName: string
  amount: number
  period: string
}
interface BudgetTracking {
  spent: number
  remaining: number
  isOverBudget: boolean
}

function getBudgetStatus(spent: number, limit: number) {
  const percentage = (spent / limit) * 100
  if (percentage >= 100) return { status: 'over', text: 'Over Budget' }
  if (percentage >= 80) return { status: 'warning', text: 'Near Limit' }
  return { status: 'healthy', text: 'On Track' }
}

export function BudgetHealth() {
  const [budgets, setBudgets] = useState<(Budget & BudgetTracking)[] | null>(null)

  useEffect(() => {
    api.get('/api/personal-budgets').then(async r => {
      const list: Budget[] = r.data ?? []
      const withTracking = await Promise.all(
        list.slice(0, 4).map(async b => {
          try {
            const t = await api.get(`/api/personal-budgets/${b.id}/tracking`)
            return { ...b, ...t.data }
          } catch {
            return { ...b, spent: 0, remaining: b.amount, isOverBudget: false }
          }
        })
      )
      setBudgets(withTracking)
    }).catch(() => setBudgets([]))
  }, [])

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Budget Health</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/finance/budgets">Manage</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!budgets ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : budgets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No budgets set up</p>
        ) : (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const percentage = Math.min((budget.spent / budget.amount) * 100, 100)
              const { status, text } = getBudgetStatus(budget.spent, budget.amount)

              return (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{budget.categoryName}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
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
                      "h-2",
                      status === 'over' && "[&>[data-slot=indicator]]:bg-destructive",
                      status === 'warning' && "[&>[data-slot=indicator]]:bg-warning",
                      status === 'healthy' && "[&>[data-slot=indicator]]:bg-success"
                    )}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatNaira(budget.spent)} spent</span>
                    <span>{formatNaira(budget.remaining)} remaining</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
