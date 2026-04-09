'use client'

import { useState, useEffect } from 'react'
import { CheckCheck, Inbox, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import { cn, formatNaira, formatDate } from '@/lib/utils'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'
import api from '@/lib/apiClient'

interface InboxItem {
  id: number
  connectedBankAccountId: number
  amountNaira: number
  direction: string
  rawNarration: string
  normalizedNarration: string
  extractedMerchant: string | null
  transactionDateUtc: string
  status: string
  isPending: boolean
  transferPairImportId: number | null
}

interface Wallet { id: number; name: string }
interface Category { id: number; name: string; type: number }

export default function BankInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Categorize dialog state
  const [categorizeItem, setCategorizeItem] = useState<InboxItem | null>(null)
  const [form, setForm] = useState({
    walletId: '',
    categoryId: '',
    transactionType: '',
    description: '',
    createRule: false,
    ruleMatchText: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Exclude dialog state
  const [excludeItem, setExcludeItem] = useState<InboxItem | null>(null)
  const [excludeNote, setExcludeNote] = useState('')

  const loadInbox = async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/bank/inbox?page=1&pageSize=50')
      setItems(r.data?.items ?? [])
      setTotalCount(r.data?.totalCount ?? 0)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInbox()
    api.get('/api/personal-wallets').then(r => setWallets(r.data ?? [])).catch(() => {})
    api.get('/api/personal-categories').then(r => setCategories(r.data ?? [])).catch(() => {})
  }, [])

  const openCategorize = (item: InboxItem) => {
    setCategorizeItem(item)
    const defaultType = item.direction?.toLowerCase() === 'credit' ? 'Income' : 'Expense'
    setForm({ walletId: '', categoryId: '', transactionType: defaultType, description: '', createRule: false, ruleMatchText: item.normalizedNarration ?? item.rawNarration ?? '' })
  }

  const handleCategorize = async () => {
    if (!categorizeItem || !form.walletId || !form.categoryId || !form.transactionType) return
    setSubmitting(true)
    try {
      await api.post(`/api/bank/inbox/${categorizeItem.id}/categorize`, {
        walletId: parseInt(form.walletId),
        categoryId: parseInt(form.categoryId),
        transactionType: form.transactionType,
        description: form.description || null,
        createRule: form.createRule,
        ruleMatchText: form.createRule ? form.ruleMatchText : null,
      })
      setCategorizeItem(null)
      await loadInbox()
    } catch {
      alert('Failed to categorize. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExclude = async () => {
    if (!excludeItem) return
    setSubmitting(true)
    try {
      await api.post(`/api/bank/inbox/${excludeItem.id}/exclude`, { note: excludeNote || null })
      setExcludeItem(null)
      setExcludeNote('')
      await loadInbox()
    } catch {
      alert('Failed to exclude. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCategories = categories.filter(c => {
    if (form.transactionType === 'Income') return c.type === 0
    if (form.transactionType === 'Expense') return c.type === 1
    return true
  })

  const pendingItems = items.filter(i => i.status === 'NeedsReview')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Bank Inbox</h1>
            {totalCount > 0 && (
              <Badge variant="secondary" className="bg-warning/20 text-warning">
                {totalCount} to review
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Review and categorize imported bank transactions
          </p>
        </div>
      </div>

      {/* Categorize Dialog */}
      <Dialog open={!!categorizeItem} onOpenChange={open => { if (!open) setCategorizeItem(null) }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Categorize Transaction</DialogTitle>
            <DialogDescription>
              {categorizeItem?.rawNarration}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Transaction Type</FieldLabel>
              <Select value={form.transactionType} onValueChange={v => setForm(p => ({ ...p, transactionType: v, categoryId: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Wallet</FieldLabel>
              <Select value={form.walletId} onValueChange={v => setForm(p => ({ ...p, walletId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                <SelectContent>
                  {wallets.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select value={form.categoryId} onValueChange={v => setForm(p => ({ ...p, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Description (optional)</FieldLabel>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Override narration" />
            </Field>
            <div className="flex items-center gap-3">
              <Checkbox
                id="createRule"
                checked={form.createRule}
                onCheckedChange={checked => setForm(p => ({ ...p, createRule: !!checked }))}
              />
              <label htmlFor="createRule" className="text-sm cursor-pointer">Create auto-categorize rule for similar transactions</label>
            </div>
            {form.createRule && (
              <Field>
                <FieldLabel>Match text for rule</FieldLabel>
                <Input value={form.ruleMatchText} onChange={e => setForm(p => ({ ...p, ruleMatchText: e.target.value }))} />
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategorizeItem(null)}>Cancel</Button>
            <Button onClick={handleCategorize} disabled={!form.walletId || !form.categoryId || !form.transactionType || submitting}>
              {submitting ? 'Saving...' : 'Categorize'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclude Dialog */}
      <Dialog open={!!excludeItem} onOpenChange={open => { if (!open) { setExcludeItem(null); setExcludeNote('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exclude Transaction</DialogTitle>
            <DialogDescription>
              This transaction will be excluded from your ledger.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>Note (optional)</FieldLabel>
            <Input value={excludeNote} onChange={e => setExcludeNote(e.target.value)} placeholder="Reason for exclusion" />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExcludeItem(null); setExcludeNote('') }}>Cancel</Button>
            <Button variant="destructive" onClick={handleExclude} disabled={submitting}>
              {submitting ? 'Excluding...' : 'Exclude'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="glass">
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : pendingItems.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon"><Inbox className="h-6 w-6" /></EmptyMedia>
              <EmptyTitle>No transactions to review</EmptyTitle>
              <EmptyDescription>
                When you sync a bank account, imported transactions will appear here for review.
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => {
                const isCredit = item.direction?.toLowerCase() === 'credit'
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-warning/5 border-warning/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{item.extractedMerchant ?? item.rawNarration}</span>
                        {item.isPending && (
                          <Badge variant="secondary" className="text-xs shrink-0">Pending</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatDate(item.transactionDateUtc)}</span>
                        {item.normalizedNarration && item.normalizedNarration !== item.rawNarration && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">{item.rawNarration}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <span className={cn(
                      'font-semibold w-32 text-right shrink-0',
                      isCredit ? 'text-success' : 'text-destructive'
                    )}>
                      {isCredit ? '+' : '-'}{formatNaira(item.amountNaira)}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openCategorize(item)}>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Categorize
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => { setExcludeItem(item); setExcludeNote('') }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
