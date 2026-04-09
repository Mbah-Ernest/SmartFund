'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/apiClient'

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function SpendingChart() {
  const [spendingData, setSpendingData] = useState<{ name: string; value: number }[] | null>(null)

  useEffect(() => {
    api.get('/api/personal-reports/dashboard')
      .then(r => {
        const cats = r.data?.topExpenseCategories ?? []
        setSpendingData(cats.map((c: { categoryName: string; amount: number }) => ({ name: c.categoryName, value: c.amount })))
      })
      .catch(() => setSpendingData([]))
  }, [])

  if (!spendingData) return <Skeleton className="h-80 w-full rounded-xl" />

  const total = spendingData.reduce((acc, item) => acc + item.value, 0)

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={spendingData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {spendingData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`oklch(${COLORS[index % COLORS.length]})`}
                    className="stroke-background stroke-2"
                  />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
                        <div className="font-medium">{data.name}</div>
                        <div className="text-muted-foreground text-sm">
                          {new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: 'NGN',
                            maximumFractionDigits: 0,
                          }).format(data.value)}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-4 space-y-2">
          {spendingData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: `oklch(${COLORS[index]})` }}
                />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-medium">
                {Math.round((item.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
