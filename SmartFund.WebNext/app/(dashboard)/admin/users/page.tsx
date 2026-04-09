'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn, formatNaira, formatDate } from '@/lib/utils'
import api from '@/lib/apiClient'

interface User {
  id: number
  email: string
  fullName: string
  role: string
  isActive: boolean
  createdAtUtc: string
}

interface CreditInsights {
  userId: number
  fullName: string
  email: string
  accountTenureDays: number
  avgMonthlyIncomeNaira: number
  avgMonthlyExpensesNaira: number
  incomeToExpenseRatio: number
  connectedBankAccountsCount: number
  budgetComplianceRate: number
  goalOnTrackRate: number
  incomeStabilityScore: number
  avgMonthlyTransactionCount: number
  totalLoanApplications: number
  mostRecentLoanStatus: string | null
}

function getStatusBadgeColor(status: string | null): string {
  if (!status) return 'bg-muted text-muted-foreground'
  switch (status.toLowerCase()) {
    case 'disbursed': return 'bg-primary/20 text-primary'
    case 'approved': return 'bg-success/20 text-success'
    case 'pending': return 'bg-warning/20 text-warning'
    case 'underreview': return 'bg-blue-500/20 text-blue-500'
    case 'rejected': return 'bg-destructive/20 text-destructive'
    default: return 'bg-muted text-muted-foreground'
  }
}

function pct(v: number) { return `${(v * 100).toFixed(0)}%` }

export default function AdminMembersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [insights, setInsights] = useState<CreditInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)

  useEffect(() => {
    api.get('/api/admin/users')
      .then(r => {
        const list: User[] = r.data ?? []
        setUsers(list)
        if (list.length > 0) setSelectedUser(list[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedUser) { setInsights(null); return }
    setInsightsLoading(true)
    api.get(`/api/admin/users/${selectedUser.id}/insights`)
      .then(r => setInsights(r.data ?? null))
      .catch(() => setInsights(null))
      .finally(() => setInsightsLoading(false))
  }, [selectedUser])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground">View member profiles and credit insights</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card className="glass">
          <CardHeader>
            <CardTitle>All Members</CardTitle>
            <CardDescription>{users.length} registered members</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.id}
                        className={cn('cursor-pointer transition-colors', selectedUser?.id === user.id && 'bg-primary/5')}
                        onClick={() => setSelectedUser(user)}
                      >
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(user.role === 'Admin' && 'bg-primary/20 text-primary')}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(user.isActive ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground')}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(user.createdAtUtc)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass h-fit sticky top-6">
          <CardHeader>
            <CardTitle>Credit Insights</CardTitle>
            <CardDescription>{selectedUser ? selectedUser.fullName : 'Select a member to view insights'}</CardDescription>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <div className="space-y-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-6 rounded" />)}</div>
            ) : insights ? (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-4">
                  <InsightRow label="Tenure" value={`${insights.accountTenureDays} days`} />
                  <Separator />
                  <InsightRow label="Avg Monthly Income" value={formatNaira(insights.avgMonthlyIncomeNaira)} />
                  <InsightRow label="Avg Monthly Expenses" value={formatNaira(insights.avgMonthlyExpensesNaira)} />
                  <InsightRow
                    label="Income/Expense Ratio"
                    value={insights.incomeToExpenseRatio.toFixed(2)}
                    highlight={insights.incomeToExpenseRatio >= 1.2 ? 'success' : insights.incomeToExpenseRatio >= 1 ? 'warning' : 'destructive'}
                  />
                  <Separator />
                  <InsightRow label="Linked Bank Accounts" value={insights.connectedBankAccountsCount.toString()} />
                  <InsightRow
                    label="Budget Compliance"
                    value={pct(insights.budgetComplianceRate)}
                    highlight={insights.budgetComplianceRate >= 0.7 ? 'success' : insights.budgetComplianceRate >= 0.5 ? 'warning' : 'destructive'}
                  />
                  <InsightRow
                    label="Goals on Track"
                    value={pct(insights.goalOnTrackRate)}
                    highlight={insights.goalOnTrackRate >= 0.7 ? 'success' : insights.goalOnTrackRate >= 0.5 ? 'warning' : 'destructive'}
                  />
                  <InsightRow
                    label="Income Stability"
                    value={pct(insights.incomeStabilityScore)}
                    highlight={insights.incomeStabilityScore >= 0.8 ? 'success' : insights.incomeStabilityScore >= 0.6 ? 'warning' : 'destructive'}
                  />
                  <Separator />
                  <InsightRow label="Avg Transactions/Month" value={insights.avgMonthlyTransactionCount.toFixed(1)} />
                  <InsightRow label="Loan Applications" value={insights.totalLoanApplications.toString()} />
                  {insights.mostRecentLoanStatus && (
                    <InsightRow
                      label="Most Recent Loan"
                      value={insights.mostRecentLoanStatus}
                      badge={{ color: getStatusBadgeColor(insights.mostRecentLoanStatus) }}
                    />
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a member from the list to view their credit insights
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InsightRow({
  label,
  value,
  highlight,
  badge,
}: {
  label: string
  value: string
  highlight?: 'success' | 'warning' | 'destructive'
  badge?: { color: string } | null
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      {badge ? (
        <Badge variant="secondary" className={badge.color}>{value}</Badge>
      ) : (
        <span className={cn(
          'text-sm font-medium',
          highlight === 'success' && 'text-success',
          highlight === 'warning' && 'text-warning',
          highlight === 'destructive' && 'text-destructive',
        )}>
          {value}
        </span>
      )}
    </div>
  )
}
