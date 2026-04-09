'use client'

import { useState, useEffect } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNaira, formatDate } from '@/lib/utils'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import api from '@/lib/apiClient'

type TransactionType = 'Income' | 'Expense' | 'Transfer'
type SortOrder = 'newest' | 'oldest' | 'amount-high' | 'amount-low'

interface Transaction {
  id: number
  date: string
  description: string
  walletName: string
  categoryName: string
  amount: number
  transactionType: TransactionType
}

interface Wallet { id: number; name: string }
interface Category { id: number; name: string; type: number } // 0=Income, 1=Expense

function getTransactionIcon(type: TransactionType) {
  switch (type) {
    case 'Income': return <ArrowDownLeft className="h-4 w-4 text-success" />
    case 'Expense': return <ArrowUpRight className="h-4 w-4 text-destructive" />
    case 'Transfer': return <ArrowLeftRight className="h-4 w-4 text-primary" />
  }
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | TransactionType>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
  const [currentPage, setCurrentPage] = useState(1)

  const [formData, setFormData] = useState({
    type: 'Expense' as TransactionType,
    walletId: '',
    destinationWalletId: '',
    categoryId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  const loadTransactions = () => {
    setLoading(true)
    api.get('/api/personal-transactions?orderBy=date&direction=desc')
      .then(r => setTransactions(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTransactions()
    api.get('/api/personal-wallets').then(r => setWallets(r.data ?? [])).catch(() => {})
    api.get('/api/personal-categories').then(r => setCategories(r.data ?? [])).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.walletId || !formData.amount || !formData.description) return
    setSubmitting(true)
    try {
      const payload = {
        walletId: parseInt(formData.walletId),
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
      }
      if (formData.type === 'Transfer') {
        await api.post('/api/personal-transactions/transfer', {
          sourceWalletId: parseInt(formData.walletId),
          destinationWalletId: parseInt(formData.destinationWalletId),
          amount: parseFloat(formData.amount),
          description: formData.description,
          date: formData.date,
        })
      } else {
        const endpoint = formData.type === 'Income' ? '/api/personal-transactions/income' : '/api/personal-transactions/expense'
        await api.post(endpoint, { ...payload, categoryId: parseInt(formData.categoryId) })
      }
      setFormData({ type: 'Expense', walletId: '', destinationWalletId: '', categoryId: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
      loadTransactions()
    } catch {
      alert('Failed to record transaction. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTransactions = transactions.filter(t =>
    filter === 'all' ? true : t.transactionType === filter
  )

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    switch (sortOrder) {
      case 'newest': return new Date(b.date).getTime() - new Date(a.date).getTime()
      case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime()
      case 'amount-high': return b.amount - a.amount
      case 'amount-low': return a.amount - b.amount
      default: return 0
    }
  })

  const itemsPerPage = 10
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage)
  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const filteredCategories = categories.filter(c =>
    formData.type === 'Income' ? c.type === 0 : c.type === 1
  )

  const isFormValid = formData.walletId && formData.amount && formData.description &&
    (formData.type === 'Transfer' ? formData.destinationWalletId : formData.categoryId)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">Record and manage your financial transactions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.8fr]">
        {/* Add Transaction Form */}
        <Card className="glass h-fit">
          <CardHeader>
            <CardTitle>Add Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    value={formData.type}
                    onValueChange={(value: TransactionType) =>
                      setFormData(prev => ({ ...prev, type: value, categoryId: '' }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>{formData.type === 'Transfer' ? 'From Wallet' : 'Wallet'}</FieldLabel>
                  <Select value={formData.walletId} onValueChange={(v) => setFormData(prev => ({ ...prev, walletId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                    <SelectContent>
                      {wallets.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                {formData.type === 'Transfer' && (
                  <Field>
                    <FieldLabel>To Wallet</FieldLabel>
                    <Select value={formData.destinationWalletId} onValueChange={(v) => setFormData(prev => ({ ...prev, destinationWalletId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                      <SelectContent>
                        {wallets.filter(w => String(w.id) !== formData.walletId).map(w => (
                          <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {formData.type !== 'Transfer' && (
                  <Field>
                    <FieldLabel>Category</FieldLabel>
                    <Select value={formData.categoryId} onValueChange={(v) => setFormData(prev => ({ ...prev, categoryId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                <Field>
                  <FieldLabel>Amount (NGN)</FieldLabel>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    min="0"
                    step="0.01"
                  />
                </Field>

                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    placeholder="Enter description..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </Field>

                <Field>
                  <FieldLabel>Date</FieldLabel>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </Field>
              </FieldGroup>

              <Button type="submit" className="w-full mt-6" disabled={!isFormValid || submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recording...</> : 'Record Transaction'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Tabs value={filter} onValueChange={(v) => { setFilter(v as typeof filter); setCurrentPage(1) }}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="Income">Income</TabsTrigger>
                  <TabsTrigger value="Expense">Expense</TabsTrigger>
                  <TabsTrigger value="Transfer">Transfer</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Select value={sortOrder} onValueChange={(v: SortOrder) => setSortOrder(v)}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="amount-high"><span className="flex items-center gap-2"><ArrowUp className="h-3 w-3" /> Amount</span></SelectItem>
                <SelectItem value="amount-low"><span className="flex items-center gap-2"><ArrowDown className="h-3 w-3" /> Amount</span></SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions found</TableCell>
                      </TableRow>
                    ) : paginatedTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-muted-foreground">{formatDate(transaction.date)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.transactionType)}
                            <span className="font-medium">{transaction.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{transaction.walletName}</TableCell>
                        <TableCell><Badge variant="secondary">{transaction.categoryName}</Badge></TableCell>
                        <TableCell className={cn(
                          "text-right font-semibold",
                          transaction.transactionType === 'Income' && "text-success",
                          transaction.transactionType === 'Expense' && "text-destructive",
                          transaction.transactionType === 'Transfer' && "text-primary"
                        )}>
                          {transaction.transactionType === 'Income' ? '+' : '-'}{formatNaira(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)) }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => { e.preventDefault(); setCurrentPage(page) }}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)) }}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
