'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/apiClient'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface CashFlowRow {
  year: number
  month: number
  inflow: number
  outflow: number
}

export function CashFlowChart() {
  const [rows, setRows] = useState<{ period: string; inflow: number; outflow: number }[] | null>(null)

  useEffect(() => {
    api.get('/api/personal-reports/cashflow')
      .then(r => {
        const raw: CashFlowRow[] = r.data ?? []
        // Aggregate by month (sum across wallets/categories)
        const byMonth = new Map<string, { inflow: number; outflow: number }>()
        for (const row of raw) {
          const key = `${row.year}-${row.month}`
          const existing = byMonth.get(key) ?? { inflow: 0, outflow: 0 }
          byMonth.set(key, { inflow: existing.inflow + row.inflow, outflow: existing.outflow + row.outflow })
        }
        const sorted = Array.from(byMonth.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6)
          .map(([k, v]) => {
            const [y, m] = k.split('-').map(Number)
            return { period: MONTH_NAMES[m - 1] + ' ' + y, inflow: v.inflow, outflow: v.outflow }
          })
        setRows(sorted)
      })
      .catch(() => setRows([]))
  }, [])

  if (!rows) return <Skeleton className="h-80 w-full rounded-xl" />

  const data = rows

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Cash Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4}>
              <XAxis 
                dataKey="period" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'oklch(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
                        <div className="font-medium mb-1">{payload[0].payload.period}</div>
                        <div className="text-success text-sm flex items-center gap-2">
                          <span>In:</span>
                          {new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: 'NGN',
                            maximumFractionDigits: 0,
                          }).format(payload[0].payload.inflow)}
                        </div>
                        <div className="text-destructive text-sm flex items-center gap-2">
                          <span>Out:</span>
                          {new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: 'NGN',
                            maximumFractionDigits: 0,
                          }).format(payload[0].payload.outflow)}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar 
                dataKey="inflow" 
                fill="oklch(var(--chart-2))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="outflow" 
                fill="oklch(var(--chart-3))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">Inflows</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-chart-3" />
            <span className="text-muted-foreground">Outflows</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
