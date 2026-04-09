'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNaira } from '@/lib/utils'
import api from '@/lib/apiClient'

interface DashboardData {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
}
interface RunwayData {
  runwayMonths: number | null
  burnTrend: number
}

export function StatCards() {
  const [dash, setDash] = useState<DashboardData | null>(null)
  const [runway, setRunway] = useState<RunwayData | null>(null)

  useEffect(() => {
    api.get('/api/personal-reports/dashboard').then(r => setDash(r.data)).catch(() => {})
    api.get('/api/personal-reports/runway').then(r => setRunway(r.data)).catch(() => {})
  }, [])

  const runwayDays = runway?.runwayMonths != null ? Math.round(runway.runwayMonths * 30) : null
  const burnTrendPct = runway ? Math.round(Math.abs(runway.burnTrend) * 100) : 0
  const burnPositive = (runway?.burnTrend ?? 0) <= 0  // negative trend = spending less = good

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Net Balance Card */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Net Balance
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {dash ? (
            <>
              <div className="text-3xl font-bold tracking-tight">
                {formatNaira(dash.totalBalance)}
              </div>
              <div className="flex items-center gap-1 text-sm mt-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Income {formatNaira(dash.monthlyIncome)} this month</span>
              </div>
            </>
          ) : (
            <Skeleton className="h-10 w-full mt-1" />
          )}
        </CardContent>
      </Card>

      {/* Cash Runway Card */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Cash Runway
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {runway ? (
            <>
              <div className="text-3xl font-bold tracking-tight">
                {runwayDays != null ? (
                  <>{runwayDays} <span className="text-lg font-normal text-muted-foreground">days</span></>
                ) : '—'}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Based on current spending rate
              </p>
            </>
          ) : (
            <Skeleton className="h-10 w-full mt-1" />
          )}
        </CardContent>
      </Card>

      {/* Month-over-Month Burn Trend */}
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Spending Trend
          </CardTitle>
          {burnPositive ? (
            <ArrowDownRight className="h-4 w-4 text-success" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          {runway ? (
            <>
              <div className={cn(
                "text-3xl font-bold tracking-tight",
                burnPositive ? "text-success" : "text-destructive"
              )}>
                {burnPositive ? '-' : '+'}{burnTrendPct}%
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Expenses vs 3-month average
              </p>
            </>
          ) : (
            <Skeleton className="h-10 w-full mt-1" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
