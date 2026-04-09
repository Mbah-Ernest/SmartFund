'use client'

import { useState, useEffect } from 'react'
import { Check, X, Eye, Send, Clock, CheckCircle2, XCircle, AlertCircle, Banknote } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { cn, formatNaira, formatDate } from '@/lib/utils'
import api from '@/lib/apiClient'

type ApplicantStatus = 'Pending' | 'Verified' | 'Rejected'
type LoanStatus = 'Pending' | 'UnderReview' | 'Approved' | 'Rejected' | 'Disbursed'

interface Applicant {
  id: number
  submittedName: string
  fullName: string | null
  phoneNumber: string | null
  emailAddress: string | null
  status: ApplicantStatus
  submittedAtUtc: string
  adminNote: string | null
}

interface LoanApplication {
  id: number
  userId: number
  amount: number
  totalRepayable: number
  purposeCategory: string
  purposeDescription: string
  durationDays: number
  bankName: string
  accountNumber: string
  accountName: string
  status: LoanStatus
  adminNote: string | null
  submittedAtUtc: string
}

function getApplicantStatusConfig(status: ApplicantStatus) {
  switch (status) {
    case 'Pending': return { label: 'Pending', color: 'bg-warning/20 text-warning' }
    case 'Verified': return { label: 'Verified', color: 'bg-success/20 text-success' }
    case 'Rejected': return { label: 'Rejected', color: 'bg-destructive/20 text-destructive' }
    default: return { label: status, color: 'bg-muted' }
  }
}

function getLoanStatusConfig(status: LoanStatus) {
  switch (status) {
    case 'Pending': return { label: 'Pending', color: 'bg-warning/20 text-warning', icon: Clock }
    case 'UnderReview': return { label: 'Under Review', color: 'bg-blue-500/20 text-blue-500', icon: AlertCircle }
    case 'Approved': return { label: 'Approved', color: 'bg-success/20 text-success', icon: CheckCircle2 }
    case 'Rejected': return { label: 'Rejected', color: 'bg-destructive/20 text-destructive', icon: XCircle }
    case 'Disbursed': return { label: 'Disbursed', color: 'bg-primary/20 text-primary', icon: Banknote }
    default: return { label: status, color: 'bg-muted', icon: AlertCircle }
  }
}

export default function AdminLoansPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loans, setLoans] = useState<LoanApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [disburseDialogOpen, setDisburseDialogOpen] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [ar, lr] = await Promise.all([
        api.get('/api/loans/applicants'),
        api.get('/api/admin/loans'),
      ])
      setApplicants(ar.data ?? [])
      setLoans(lr.data ?? [])
    } catch {
      setApplicants([]); setLoans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const handleVerifyApplicant = async (id: number) => {
    if (!selectedApplicant) return
    setSubmitting(true)
    try {
      await api.post(`/api/loans/applicants/${id}/verify`, {
        fullName: selectedApplicant.submittedName,
        phoneNumber: selectedApplicant.phoneNumber ?? '',
        emailAddress: selectedApplicant.emailAddress ?? '',
        emergencyContactNumber: '',
        adminNote: null,
      })
      setSelectedApplicant(null)
      await loadAll()
    } catch { alert('Failed to verify applicant.') }
    finally { setSubmitting(false) }
  }

  const handleRejectApplicant = async (id: number) => {
    setSubmitting(true)
    try {
      await api.post(`/api/loans/applicants/${id}/reject`, { adminNote: null })
      setSelectedApplicant(null)
      await loadAll()
    } catch { alert('Failed to reject applicant.') }
    finally { setSubmitting(false) }
  }

  const handleStartReview = async (id: number) => {
    try {
      await api.put(`/api/admin/loans/${id}/start-review`)
      await loadAll()
    } catch { alert('Failed to start review.') }
  }

  const handleApproveLoan = async (id: number) => {
    setSubmitting(true)
    try {
      await api.put(`/api/admin/loans/${id}/review`, { action: 'approve', note: adminNote || null })
      setSelectedLoan(null)
      setAdminNote('')
      await loadAll()
    } catch { alert('Failed to approve loan.') }
    finally { setSubmitting(false) }
  }

  const handleRejectLoan = async (id: number) => {
    setSubmitting(true)
    try {
      await api.put(`/api/admin/loans/${id}/review`, { action: 'reject', note: adminNote || null })
      setSelectedLoan(null)
      setAdminNote('')
      await loadAll()
    } catch { alert('Failed to reject loan.') }
    finally { setSubmitting(false) }
  }

  const handleDisburseLoan = async (id: number) => {
    setSubmitting(true)
    try {
      await api.put(`/api/admin/loans/${id}/disburse`)
      setDisburseDialogOpen(false)
      setSelectedLoan(null)
      await loadAll()
    } catch { alert('Failed to disburse loan.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Loan Applications</h1>
        <p className="text-muted-foreground">Review and manage loan applications</p>
      </div>

      <Tabs defaultValue="loans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="applicants">Applicants</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
        </TabsList>

        {/* Applicants Tab */}
        <TabsContent value="applicants">
          <Card className="glass">
            <CardHeader><CardTitle>Applicants</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applicants.map((applicant) => {
                        const statusConfig = getApplicantStatusConfig(applicant.status)
                        return (
                          <TableRow key={applicant.id}>
                            <TableCell className="font-medium">{applicant.fullName ?? applicant.submittedName}</TableCell>
                            <TableCell>{applicant.emailAddress ?? '—'}</TableCell>
                            <TableCell>{applicant.phoneNumber ?? '—'}</TableCell>
                            <TableCell>{formatDate(applicant.submittedAtUtc)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={statusConfig.color}>{statusConfig.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {applicant.status === 'Pending' && (
                                <Button variant="outline" size="sm" onClick={() => setSelectedApplicant(applicant)}>
                                  <Eye className="h-4 w-4 mr-1" />Review
                                </Button>
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
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans">
          <Card className="glass">
            <CardHeader><CardTitle>Loan Applications</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Total Repay</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loans.map((loan) => {
                        const statusConfig = getLoanStatusConfig(loan.status)
                        const StatusIcon = statusConfig.icon
                        return (
                          <TableRow key={loan.id}>
                            <TableCell className="font-semibold">{formatNaira(loan.amount)}</TableCell>
                            <TableCell>{formatNaira(loan.totalRepayable)}</TableCell>
                            <TableCell>{loan.purposeCategory}</TableCell>
                            <TableCell>{loan.durationDays} days</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('gap-1', statusConfig.color)}>
                                <StatusIcon className="h-3 w-3" />{statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {loan.status === 'Pending' && (
                                  <Button variant="outline" size="sm" onClick={() => handleStartReview(loan.id)}>
                                    Start Review
                                  </Button>
                                )}
                                {loan.status === 'UnderReview' && (
                                  <Button variant="outline" size="sm" onClick={() => { setSelectedLoan(loan); setAdminNote(loan.adminNote ?? '') }}>
                                    <Eye className="h-4 w-4 mr-1" />Review
                                  </Button>
                                )}
                                {loan.status === 'Approved' && (
                                  <Button size="sm" onClick={() => { setSelectedLoan(loan); setDisburseDialogOpen(true) }}>
                                    <Send className="h-4 w-4 mr-1" />Disburse
                                  </Button>
                                )}
                              </div>
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
        </TabsContent>
      </Tabs>

      {/* Applicant Review Dialog */}
      <Dialog open={!!selectedApplicant} onOpenChange={() => setSelectedApplicant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Applicant</DialogTitle>
            <DialogDescription>Verify the applicant&apos;s identity and information</DialogDescription>
          </DialogHeader>
          {selectedApplicant && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <p><span className="text-muted-foreground">Name:</span> {selectedApplicant.fullName ?? selectedApplicant.submittedName}</p>
                <p><span className="text-muted-foreground">Email:</span> {selectedApplicant.emailAddress ?? '—'}</p>
                <p><span className="text-muted-foreground">Phone:</span> {selectedApplicant.phoneNumber ?? '—'}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleRejectApplicant(selectedApplicant.id)} disabled={submitting}>
                  <X className="h-4 w-4 mr-1" />Reject
                </Button>
                <Button onClick={() => handleVerifyApplicant(selectedApplicant.id)} disabled={submitting}>
                  <Check className="h-4 w-4 mr-1" />Verify
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Loan Review Dialog */}
      <Dialog open={!!selectedLoan && !disburseDialogOpen} onOpenChange={() => setSelectedLoan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Loan Application</DialogTitle>
            <DialogDescription>Review the loan details and make a decision</DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="text-sm text-muted-foreground">Amount</p><p className="font-medium">{formatNaira(selectedLoan.amount)}</p></div>
                <div><p className="text-sm text-muted-foreground">Total Repayable</p><p className="font-medium">{formatNaira(selectedLoan.totalRepayable)}</p></div>
                <div><p className="text-sm text-muted-foreground">Duration</p><p className="font-medium">{selectedLoan.durationDays} days</p></div>
                <div><p className="text-sm text-muted-foreground">Purpose</p><p className="font-medium">{selectedLoan.purposeCategory}</p></div>
                <div><p className="text-sm text-muted-foreground">Bank Details</p><p className="font-medium">{selectedLoan.bankName} — {selectedLoan.accountNumber}</p></div>
                <div><p className="text-sm text-muted-foreground">Account Name</p><p className="font-medium">{selectedLoan.accountName}</p></div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{selectedLoan.purposeDescription}</p>
              </div>
              <Field>
                <FieldLabel>Admin Note</FieldLabel>
                <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Add a note (optional)..." rows={3} />
              </Field>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleRejectLoan(selectedLoan.id)} disabled={submitting}>
                  <X className="h-4 w-4 mr-1" />Reject
                </Button>
                <Button onClick={() => handleApproveLoan(selectedLoan.id)} disabled={submitting}>
                  <Check className="h-4 w-4 mr-1" />Approve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disburse Confirmation Dialog */}
      <Dialog open={disburseDialogOpen} onOpenChange={setDisburseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Disbursement</DialogTitle>
            <DialogDescription>Review the details before disbursing the loan</DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50 grid gap-2">
                <p><span className="text-muted-foreground">Amount:</span> {formatNaira(selectedLoan.amount)}</p>
                <p><span className="text-muted-foreground">Bank:</span> {selectedLoan.bankName}</p>
                <p><span className="text-muted-foreground">Account:</span> {selectedLoan.accountNumber}</p>
                <p><span className="text-muted-foreground">Name:</span> {selectedLoan.accountName}</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDisburseDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => handleDisburseLoan(selectedLoan.id)} disabled={submitting}>
                  <Send className="h-4 w-4 mr-1" />{submitting ? 'Disbursing...' : 'Confirm Disbursement'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
