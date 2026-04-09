'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, Clock, CheckCircle2, XCircle, Banknote, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNaira, formatDate } from '@/lib/utils'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import api from '@/lib/apiClient'

type LoanStatus = 'Pending' | 'UnderReview' | 'Approved' | 'Rejected' | 'Disbursed'

interface Loan {
  id: number
  amount: number
  totalRepayable: number
  purposeCategory: string
  purposeDescription: string
  durationDays: number
  status: LoanStatus
  submittedAtUtc: string
  adminNote?: string | null
}

function getStatusConfig(status: LoanStatus) {
  switch (status) {
    case 'Pending':
      return { label: 'Pending', color: 'bg-warning/20 text-warning border-warning/30', icon: Clock }
    case 'UnderReview':
      return { label: 'Under Review', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30', icon: AlertCircle }
    case 'Approved':
      return { label: 'Approved', color: 'bg-success/20 text-success border-success/30', icon: CheckCircle2 }
    case 'Rejected':
      return { label: 'Rejected', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: XCircle }
    case 'Disbursed':
      return { label: 'Disbursed', color: 'bg-primary/20 text-primary border-primary/30', icon: Banknote }
    default:
      return { label: status, color: 'bg-secondary', icon: AlertCircle }
  }
}

export default function MyLoansPage() {
  const searchParams = useSearchParams()
  const submitted = searchParams.get('submitted') === 'true'
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/loans/my')
      .then(r => setLoans(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const hasLoans = loans.length > 0

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Loans</h1>
          <p className="text-muted-foreground">
            Track your loan applications and repayments
          </p>
        </div>
        <Button asChild>
          <Link href="/loans/apply">
            <Plus className="h-4 w-4 mr-2" />
            Apply for a Loan
          </Link>
        </Button>
      </div>

      {submitted && (
        <Alert className="mb-6 border-success/50 bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            Your loan application has been submitted successfully! We&apos;ll review it and get back to you shortly.
          </AlertDescription>
        </Alert>
      )}

      <Card className="glass">
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : !hasLoans ? (
            <Empty>
              <EmptyMedia variant="icon">
                <FileText className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No loan applications yet</EmptyTitle>
              <EmptyDescription>
                Apply for your first micro-loan to get started. Quick approval, competitive rates.
              </EmptyDescription>
              <EmptyContent>
                <Button asChild>
                  <Link href="/loans/apply">
                    <Plus className="h-4 w-4 mr-2" />
                    Apply for a Loan
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Submitted</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Total Repay</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => {
                    const statusConfig = getStatusConfig(loan.status)
                    const StatusIcon = statusConfig.icon

                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(loan.submittedAtUtc)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatNaira(loan.amount)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatNaira(loan.totalRepayable)}
                        </TableCell>
                        <TableCell>{loan.purposeCategory}</TableCell>
                        <TableCell>{loan.durationDays} days</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={cn("gap-1", statusConfig.color)}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {loan.adminNote ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-muted-foreground truncate max-w-[150px] block cursor-help">
                                  {loan.adminNote}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">{loan.adminNote}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
