'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import api from '@/lib/apiClient'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface WalletBalanceRow { year: number; month: number; balance: number }

export function NetWorthChart() {
  const [data, setData] = useState<{ month: string; value: number }[] | null>(null)

  useEffect(() => {
    api.get('/api/personal-reports/wallet-balances')
      .then(r => {
        const rows: WalletBalanceRow[] = r.data ?? []
        const byMonth = new Map<string, number>()
        for (const row of rows) {
          const key = `${row.year}-${String(row.month).padStart(2, '0')}`
          byMonth.set(key, (byMonth.get(key) ?? 0) + row.balance)
        }
        const sorted = Array.from(byMonth.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6)
          .map(([k, v]) => {
            const [, m] = k.split('-').map(Number)
            return { month: MONTH_NAMES[m - 1], value: v }
          })
        setData(sorted)
      })
      .catch(() => setData([]))
  }, [])

  if (!data) return <Skeleton className="h-80 w-full rounded-xl" />
  const netWorthData = data

  const firstValue = netWorthData[0]?.value ?? 0
  const lastValue = netWorthData[netWorthData.length - 1]?.value ?? 0
  const growthPct = firstValue > 0 ? (((lastValue - firstValue) / firstValue) * 100).toFixed(1) : null

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">Net Worth Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={netWorthData}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'oklch(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                hide 
                domain={['dataMin - 200000', 'dataMax + 100000']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
                        <div className="font-medium">{payload[0].payload.month}</div>
                        <div className="text-muted-foreground text-sm">
                          {new Intl.NumberFormat('en-NG', {
                            style: 'currency',
                            currency: 'NGN',
                            maximumFractionDigits: 0,
                          }).format(payload[0].value as number)}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="oklch(var(--chart-1))"
                strokeWidth={2}
                fill="url(#netWorthGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last 6 months</span>
          {growthPct != null && (
            <span className={lastValue >= firstValue ? 'text-success font-medium' : 'text-destructive font-medium'}>
              {lastValue >= firstValue ? '+' : ''}{growthPct}% growth
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
