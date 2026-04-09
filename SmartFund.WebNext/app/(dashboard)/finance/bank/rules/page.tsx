'use client'

import { useState, useEffect } from 'react'
import { Plus, GitBranch, MoreVertical, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import api from '@/lib/apiClient'

interface Rule {
  id: number
  matchText: string
  isRegex: boolean
  caseSensitive: boolean
  categoryId: number
  transactionType: string
  priority: number
  isActive: boolean
  description: string | null
  autoPostCredits: boolean
  matchCount: number
}

interface Category { id: number; name: string; type: number }

export default function BankRulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newRule, setNewRule] = useState({
    matchText: '',
    transactionType: 'Expense',
    categoryId: '',
    priority: '10',
    description: '',
    isRegex: false,
    caseSensitive: false,
    autoPostCredits: false,
  })

  const loadRules = async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/bank/rules')
      setRules(r.data ?? [])
    } catch {
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRules()
    api.get('/api/personal-categories').then(r => setCategories(r.data ?? [])).catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!newRule.matchText || !newRule.categoryId) return
    setSubmitting(true)
    try {
      await api.post('/api/bank/rules', {
        matchText: newRule.matchText,
        isRegex: newRule.isRegex,
        caseSensitive: newRule.caseSensitive,
        categoryId: parseInt(newRule.categoryId),
        transactionType: newRule.transactionType,
        priority: parseInt(newRule.priority) || 10,
        description: newRule.description || null,
        autoPostCredits: newRule.autoPostCredits,
      })
      setNewRule({ matchText: '', transactionType: 'Expense', categoryId: '', priority: '10', description: '', isRegex: false, caseSensitive: false, autoPostCredits: false })
      setDialogOpen(false)
      await loadRules()
    } catch {
      alert('Failed to create rule.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (rule: Rule) => {
    try {
      await api.put(`/api/bank/rules/${rule.id}`, {
        matchText: rule.matchText,
        isRegex: rule.isRegex,
        caseSensitive: rule.caseSensitive,
        categoryId: rule.categoryId,
        transactionType: rule.transactionType,
        priority: rule.priority,
        description: rule.description,
        autoPostCredits: rule.autoPostCredits,
      })
      // Optimistic update
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
    } catch {
      alert('Failed to update rule.')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/bank/rules/${id}`)
      setRules(prev => prev.filter(r => r.id !== id))
    } catch {
      alert('Failed to delete rule.')
    }
  }

  const getCategoryName = (id: number) => categories.find(c => c.id === id)?.name ?? `Cat #${id}`

  const filteredCategories = categories.filter(c =>
    newRule.transactionType === 'Income' ? c.type === 0 : c.type === 1
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Rules</h1>
          <p className="text-muted-foreground">
            Automatically categorize imported bank transactions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Create Rule</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Create Bank Rule</DialogTitle>
              <DialogDescription>
                Transactions whose narration matches the text will be automatically categorized
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>Match Text</FieldLabel>
                <Input
                  placeholder="e.g., UBER, MTN, FILMHOUSE"
                  value={newRule.matchText}
                  onChange={e => setNewRule(p => ({ ...p, matchText: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel>Transaction Type</FieldLabel>
                <Select value={newRule.transactionType} onValueChange={v => setNewRule(p => ({ ...p, transactionType: v, categoryId: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Expense">Expense</SelectItem>
                    <SelectItem value="Income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Category</FieldLabel>
                <Select value={newRule.categoryId} onValueChange={v => setNewRule(p => ({ ...p, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Priority (lower = higher priority)</FieldLabel>
                <Input
                  type="number"
                  value={newRule.priority}
                  onChange={e => setNewRule(p => ({ ...p, priority: e.target.value }))}
                  min="1"
                />
              </Field>
              <Field>
                <FieldLabel>Description (optional)</FieldLabel>
                <Input
                  placeholder="Rule description"
                  value={newRule.description}
                  onChange={e => setNewRule(p => ({ ...p, description: e.target.value }))}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newRule.matchText || !newRule.categoryId || submitting}>
                {submitting ? 'Creating...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : rules.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12">
            <Empty>
              <EmptyMedia variant="icon"><GitBranch className="h-6 w-6" /></EmptyMedia>
              <EmptyTitle>No rules created</EmptyTitle>
              <EmptyDescription>
                Create rules to automatically categorize your imported bank transactions
              </EmptyDescription>
              <EmptyContent>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Create Rule
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <Card key={rule.id} className="glass">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => handleToggle(rule)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{rule.matchText}</span>
                      {rule.isRegex && <Badge variant="outline" className="text-xs">regex</Badge>}
                      <Badge variant="secondary" className="text-xs">{rule.matchCount} matches</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>→</span>
                      <Badge variant={rule.transactionType === 'Income' ? 'default' : 'secondary'}>
                        {rule.transactionType}
                      </Badge>
                      <span>{getCategoryName(rule.categoryId)}</span>
                      {rule.description && <span className="text-xs">• {rule.description}</span>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
