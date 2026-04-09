import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCards } from '@/components/dashboard/stat-cards'
import { SpendingChart } from '@/components/dashboard/spending-chart'
import { NetWorthChart } from '@/components/dashboard/net-worth-chart'
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { BudgetHealth } from '@/components/dashboard/budget-health'
import { AIInsights } from '@/components/dashboard/ai-insights'

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your financial overview at a glance
        </p>
      </div>

      {/* Stats Row */}
      <Suspense fallback={<StatsSkeletons />}>
        <StatCards />
      </Suspense>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Suspense fallback={<ChartSkeleton />}>
          <SpendingChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <NetWorthChart />
        </Suspense>
        <Suspense fallback={<ChartSkeleton />}>
          <CashFlowChart />
        </Suspense>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<TableSkeleton />}>
            <RecentTransactions />
          </Suspense>
        </div>
        <div className="space-y-6">
          <Suspense fallback={<ChartSkeleton />}>
            <BudgetHealth />
          </Suspense>
          <Suspense fallback={<ChartSkeleton />}>
            <AIInsights />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function StatsSkeletons() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-32 w-full rounded-xl" />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-80 w-full rounded-xl" />
}

function TableSkeleton() {
  return <Skeleton className="h-96 w-full rounded-xl" />
}
