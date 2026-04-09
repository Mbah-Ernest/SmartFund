'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { formatNaira } from '@/lib/utils'
import api from '@/lib/apiClient'

const durations = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
]

const purposes = [
  { value: 'Education', label: 'Education' },
  { value: 'Medical', label: 'Medical Emergency' },
  { value: 'Business', label: 'Business' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Other', label: 'Other' },
]

export default function LoanApplicationPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasLinkedBank, setHasLinkedBank] = useState(false)

  useEffect(() => {
    api.get('/api/bank/accounts').then(r => {
      setHasLinkedBank((r.data ?? []).length > 0)
    }).catch(() => {})
  }, [])

  const [formData, setFormData] = useState({
    amount: '',
    duration: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    purpose: '',
    description: '',
  })

  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const amount = parseFloat(formData.amount) || 0
  const duration = parseInt(formData.duration) || 0

  // Calculate loan details
  const loanDetails = useMemo(() => {
    if (!amount || !duration) return null

    const dailyRate = amount <= 100000 ? 0.009 : 0.0088 // 0.9% or 0.88%
    const interestAmount = amount * dailyRate * duration
    const totalRepayable = amount + interestAmount
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + duration)

    return {
      dailyRate: dailyRate * 100,
      interestAmount,
      totalRepayable,
      dueDate,
    }
  }, [amount, duration])

  const validations = {
    amount: amount >= 1000 && amount <= 500000,
    duration: duration > 0,
    bankName: formData.bankName.trim().length > 0,
    accountName: formData.accountName.trim().length >= 3,
    accountNumber: /^\d{10}$/.test(formData.accountNumber),
    confirmAccountNumber: formData.accountNumber === formData.confirmAccountNumber,
    purpose: formData.purpose.length > 0,
    description: formData.description.trim().length >= 10,
  }

  const isValid = Object.values(validations).every(Boolean)
  const showBankWarning = amount > 5000 && !hasLinkedBank

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsSubmitting(true)
    try {
      // Ensure applicant profile exists
      const profileRes = await api.get('/api/loans/applicants/me')
      if (!profileRes.data) {
        await api.post('/api/loans/applicants', { fullName: formData.accountName })
      }

      await api.post('/api/loans', {
        amount: amount,
        durationDays: duration,
        repaymentInstallments: 1,
        accountNumber: formData.accountNumber,
        bankName: formData.bankName,
        accountName: formData.accountName,
        purposeCategory: formData.purpose,
        purposeDescription: formData.description,
      })

      router.push('/loans/my?submitted=true')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      alert(e.response?.data?.error ?? 'Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Apply for a Loan</h1>
        <p className="text-muted-foreground">
          Quick micro-loans for Nigerian students with competitive rates
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Application Form */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Loan Application Form</CardTitle>
            <CardDescription>
              Fill in your details to apply for a micro-loan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Loan Amount (NGN)</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      onBlur={() => handleBlur('amount')}
                      min="1000"
                      max="500000"
                      step="1000"
                    />
                    {touched.amount && !validations.amount && (
                      <FieldError>Amount must be between ₦1,000 and ₦500,000</FieldError>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel>Duration</FieldLabel>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {durations.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Separator className="my-2" />

                <Field>
                  <FieldLabel>Bank Name</FieldLabel>
                  <Input
                    placeholder="e.g., GTBank, Access Bank"
                    value={formData.bankName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                    onBlur={() => handleBlur('bankName')}
                  />
                  {touched.bankName && !validations.bankName && (
                    <FieldError>Please enter your bank name</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel>Account Name</FieldLabel>
                  <Input
                    placeholder="Enter account name as on bank account"
                    value={formData.accountName}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                    onBlur={() => handleBlur('accountName')}
                  />
                  {touched.accountName && !validations.accountName && (
                    <FieldError>Please enter your account name</FieldError>
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Account Number</FieldLabel>
                    <Input
                      placeholder="10-digit account number"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                      onBlur={() => handleBlur('accountNumber')}
                      maxLength={10}
                    />
                    {touched.accountNumber && !validations.accountNumber && (
                      <FieldError>Enter a valid 10-digit account number</FieldError>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel>Re-type Account Number</FieldLabel>
                    <Input
                      placeholder="Confirm account number"
                      value={formData.confirmAccountNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmAccountNumber: e.target.value }))}
                      onBlur={() => handleBlur('confirmAccountNumber')}
                      maxLength={10}
                    />
                    {touched.confirmAccountNumber && !validations.confirmAccountNumber && (
                      <FieldError>Account numbers do not match</FieldError>
                    )}
                  </Field>
                </div>

                <Separator className="my-2" />

                <Field>
                  <FieldLabel>Purpose of Loan</FieldLabel>
                  <Select
                    value={formData.purpose}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, purpose: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {purposes.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    placeholder="Briefly describe what you need the loan for..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    onBlur={() => handleBlur('description')}
                    rows={4}
                  />
                  {touched.description && !validations.description && (
                    <FieldError>Please provide a description (at least 10 characters)</FieldError>
                  )}
                </Field>

                {showBankWarning && (
                  <Alert className="border-warning/50 bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
                      For loans above ₦5,000, we recommend linking your bank account for faster verification and disbursement.
                    </AlertDescription>
                  </Alert>
                )}
              </FieldGroup>

              <Button 
                type="submit" 
                className="w-full mt-6" 
                disabled={!isValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loan Preview */}
        <div className="space-y-6">
          <Card className="glass sticky top-6">
            <CardHeader>
              <CardTitle>Loan Summary</CardTitle>
              <CardDescription>
                Live preview of your loan terms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loanDetails ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Principal Amount</span>
                    <span className="font-semibold">{formatNaira(amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Daily Interest Rate</span>
                    <span className="font-semibold">{loanDetails.dailyRate}%</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Loan Duration</span>
                    <span className="font-semibold">{duration} days</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Interest Amount</span>
                    <span className="font-semibold text-warning">{formatNaira(loanDetails.interestAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-3 bg-primary/10 rounded-lg px-3 -mx-3">
                    <span className="font-medium">Total Repayable</span>
                    <span className="font-bold text-lg text-primary">{formatNaira(loanDetails.totalRepayable)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Repayment Due Date</span>
                    <span className="font-semibold">
                      {loanDetails.dueDate.toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Enter loan amount and duration to see preview</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">Interest Rates</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Loans up to ₦100,000: 0.9% daily</li>
                <li>• Loans above ₦100,000: 0.88% daily</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
