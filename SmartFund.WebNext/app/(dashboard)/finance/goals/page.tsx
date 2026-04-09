'use client'

import { useState, useEffect } from 'react'
import { Plus, Target, Wallet, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNaira } from '@/lib/utils'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import api from '@/lib/apiClient'

interface Goal {
  id: number
  name: string
  targetAmount: number
  savedAmount: number
  deadline?: string
}
interface WalletItem { id: number; name: string; currency: string }
interface WalletBalance { walletId: number; balance: number }

export default function GoalsAndWalletsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [wallets, setWallets] = useState<WalletItem[]>([])
  const [balances, setBalances] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)
  const [contributeGoalId, setContributeGoalId] = useState<number | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [newGoal, setNewGoal] = useState({ name: '', target: '', deadline: '' })
  const [newWallet, setNewWallet] = useState({ name: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [gr, wr] = await Promise.all([
        api.get('/api/personal-goals'),
        api.get('/api/personal-wallets'),
      ])
      setGoals(gr.data ?? [])
      const wList: WalletItem[] = wr.data ?? []
      setWallets(wList)
      // load balances
      const bMap: Record<number, number> = {}
      await Promise.all(wList.map(async w => {
        try {
          const b = await api.get(`/api/personal-wallets/${w.id}/balance`)
          bMap[w.id] = b.data?.balance ?? 0
        } catch { bMap[w.id] = 0 }
      }))
      setBalances(bMap)
    } catch {
      setGoals([]); setWallets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleAddGoal = async () => {
    if (!newGoal.name || !newGoal.target) return
    setSubmitting(true)
    try {
      await api.post('/api/personal-goals', {
        name: newGoal.name,
        targetAmount: parseFloat(newGoal.target),
        deadline: newGoal.deadline || undefined,
      })
      setNewGoal({ name: '', target: '', deadline: '' })
      setGoalDialogOpen(false)
      await loadData()
    } catch { alert('Failed to create goal.') }
    finally { setSubmitting(false) }
  }

  const handleAddWallet = async () => {
    if (!newWallet.name) return
    setSubmitting(true)
    try {
      await api.post('/api/personal-wallets', { name: newWallet.name, currency: 'NGN' })
      setNewWallet({ name: '' })
      setWalletDialogOpen(false)
      await loadData()
    } catch { alert('Failed to add wallet.') }
    finally { setSubmitting(false) }
  }

  const handleContribute = async () => {
    if (!contributeGoalId || !contributeAmount) return
    setSubmitting(true)
    try {
      await api.post(`/api/personal-goals/${contributeGoalId}/contribute`, { amount: parseFloat(contributeAmount) })
      setContributeGoalId(null)
      setContributeAmount('')
      await loadData()
    } catch { alert('Failed to record contribution.') }
    finally { setSubmitting(false) }
  }

  const totalBalance = Object.values(balances).reduce((s, b) => s + b, 0)

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Goals & Wallets</h1>
        <p className="text-muted-foreground">Track your savings goals and manage your wallets</p>
      </div>

      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="goals"><Target className="h-4 w-4 mr-2" />Goals</TabsTrigger>
          <TabsTrigger value="wallets"><Wallet className="h-4 w-4 mr-2" />Wallets</TabsTrigger>
        </TabsList>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <div className="flex justify-end mb-6">
            <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Goal</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Savings Goal</DialogTitle>
                  <DialogDescription>Set a target amount and track your progress</DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Goal Name</FieldLabel>
                    <Input placeholder="e.g., New Laptop" value={newGoal.name} onChange={e => setNewGoal(p => ({ ...p, name: e.target.value }))} />
                  </Field>
                  <Field>
                    <FieldLabel>Target Amount (NGN)</FieldLabel>
                    <Input type="number" placeholder="0" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))} />
                  </Field>
                  <Field>
                    <FieldLabel>Target Date (Optional)</FieldLabel>
                    <Input type="date" value={newGoal.deadline} onChange={e => setNewGoal(p => ({ ...p, deadline: e.target.value }))} />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddGoal} disabled={!newGoal.name || !newGoal.target || submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Goal'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Contribute dialog */}
          <Dialog open={contributeGoalId !== null} onOpenChange={open => { if (!open) { setContributeGoalId(null); setContributeAmount('') } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contribution</DialogTitle>
              </DialogHeader>
              <Field>
                <FieldLabel>Amount (NGN)</FieldLabel>
                <Input type="number" placeholder="0" value={contributeAmount} onChange={e => setContributeAmount(e.target.value)} />
              </Field>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setContributeGoalId(null); setContributeAmount('') }}>Cancel</Button>
                <Button onClick={handleContribute} disabled={!contributeAmount || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Contribute'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : goals.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12">
                <Empty>
                  <EmptyMedia variant="icon"><Target className="h-6 w-6" /></EmptyMedia>
                  <EmptyTitle>No savings goals yet</EmptyTitle>
                  <EmptyDescription>Create your first savings goal to start tracking your progress</EmptyDescription>
                  <EmptyContent>
                    <Button onClick={() => setGoalDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Goal</Button>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goals.map(goal => {
                const pct = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100)
                const remaining = goal.targetAmount - goal.savedAmount
                return (
                  <Card key={goal.id} className="glass">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Target className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{goal.name}</h3>
                          {goal.deadline && (
                            <p className="text-xs text-muted-foreground">
                              Due: {new Date(goal.deadline).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{pct.toFixed(0)}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{formatNaira(goal.savedAmount)}</span>
                          <span className="text-muted-foreground">of {formatNaira(goal.targetAmount)}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{formatNaira(remaining)} remaining</p>
                        <Button size="sm" variant="outline" onClick={() => setContributeGoalId(goal.id)}>
                          + Contribute
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets">
          <div className="flex items-center justify-between mb-6">
            <Card className="glass">
              <CardContent className="py-4 px-6">
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold">{formatNaira(totalBalance)}</p>
              </CardContent>
            </Card>
            <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Wallet</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Wallet</DialogTitle>
                  <DialogDescription>Create a new wallet to track your money</DialogDescription>
                </DialogHeader>
                <Field>
                  <FieldLabel>Wallet Name</FieldLabel>
                  <Input placeholder="e.g., Emergency Fund" value={newWallet.name} onChange={e => setNewWallet({ name: e.target.value })} />
                </Field>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setWalletDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddWallet} disabled={!newWallet.name || submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Wallet'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {wallets.map(wallet => {
                const balance = balances[wallet.id] ?? 0
                return (
                  <Card key={wallet.id} className="glass">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold">{wallet.name}</h3>
                      </div>
                      <p className="text-2xl font-bold">{formatNaira(balance)}</p>
                      {totalBalance > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {((balance / totalBalance) * 100).toFixed(1)}% of total
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
