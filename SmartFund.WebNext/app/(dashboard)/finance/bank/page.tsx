'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, Plus, RefreshCw, Unlink, ShieldCheck, Wallet, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatNaira, formatDateTime } from '@/lib/utils'
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import api from '@/lib/apiClient'

declare global {
  interface Window {
    Connect: new (config: {
      key: string
      data?: { customer?: { name?: string; email?: string } }
      onSuccess: (data: { code?: string; id?: string }) => void
      onClose?: () => void
    }) => { setup: () => void; open: () => void }
  }
}

const MONO_SCRIPT_URL = 'https://connect.withmono.com/connect.js'
const MAX_ACCOUNTS = 5

interface BankAccount {
  id: number
  bankName: string
  accountNumber: string
  balanceNaira: number
  lastSyncedAtUtc: string | null
  syncStatus: string
}

export default function BankPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scriptLoadedRef = useRef(false)

  const loadAccounts = () => {
    setLoading(true)
    api.get('/api/bank/accounts')
      .then(r => setAccounts(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAccounts()
    // Load Mono Connect script
    if (!document.getElementById('mono-connect-js')) {
      const script = document.createElement('script')
      script.id = 'mono-connect-js'
      script.src = MONO_SCRIPT_URL
      script.async = true
      script.onload = () => { scriptLoadedRef.current = true }
      document.head.appendChild(script)
    } else {
      scriptLoadedRef.current = true
    }
  }, [])

  const openConnectWidget = async (isReauth?: number) => {
    if (!isReauth && accounts.length >= MAX_ACCOUNTS) {
      setError(`Maximum ${MAX_ACCOUNTS} accounts allowed.`)
      return
    }
    if (!window.Connect) {
      setError('Mono Connect is still loading — please try again in a moment.')
      return
    }
    setConnecting(true)
    setError(null)
    setConnectDialogOpen(false)
    try {
      const tokenRes = await api.get(isReauth ? `/api/bank/accounts/${isReauth}/reauth` : '/api/bank/connect-token')
      const token = tokenRes.data?.token ?? tokenRes.data

      const instance = new window.Connect({
        key: token,
        onSuccess: async (data: { code?: string; id?: string }) => {
          try {
            const authCode = data.code ?? data.id
            if (!authCode) throw new Error('Mono did not return an authorization code.')
            await api.post('/api/bank/connect', { authCode })
            loadAccounts()
          } catch (err: unknown) {
            const e = err as { message?: string }
            setError(e.message ?? 'Failed to connect account.')
          } finally {
            setConnecting(false)
          }
        },
        onClose: () => setConnecting(false),
      })
      instance.setup()
      instance.open()
    } catch {
      setError('Failed to get connection token. Please try again.')
      setConnecting(false)
    }
  }

  const handleSync = async (id: number) => {
    setSyncingId(id)
    try {
      await api.post(`/api/bank/accounts/${id}/sync`)
      loadAccounts()
    } catch { setError('Sync failed. Please try again.') }
    finally { setSyncingId(null) }
  }

  const handleDisconnect = async (id: number) => {
    try {
      await api.delete(`/api/bank/accounts/${id}`)
      setAccounts(prev => prev.filter(a => a.id !== id))
    } catch { setError('Failed to disconnect account.') }
  }

  const hasAccounts = accounts.length > 0
  const canAddMore = accounts.length < MAX_ACCOUNTS

  const ConnectDialogContent = () => (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Connect Your Bank</DialogTitle>
        <DialogDescription>
          We use Mono to securely connect to your bank. Your credentials are never stored on our servers.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
          <ShieldCheck className="h-8 w-8 text-success shrink-0" />
          <div>
            <p className="font-medium">Bank-level Security</p>
            <p className="text-sm text-muted-foreground">Your data is encrypted end-to-end</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
          <Wallet className="h-8 w-8 text-primary shrink-0" />
          <div>
            <p className="font-medium">Auto-sync Transactions</p>
            <p className="text-sm text-muted-foreground">Transactions import automatically</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
          <Clock className="h-8 w-8 text-warning shrink-0" />
          <div>
            <p className="font-medium">Real-time Balances</p>
            <p className="text-sm text-muted-foreground">See your balance anytime</p>
          </div>
        </div>
      </div>
      <Button onClick={() => openConnectWidget()} className="w-full" disabled={connecting}>
        {connecting ? 'Connecting...' : 'Launch Mono Connect'}
      </Button>
    </DialogContent>
  )

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Bank Connection</h1>
        <p className="text-muted-foreground">Link your bank accounts to automatically import transactions</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      {loading ? (
        <Card className="glass"><CardContent className="py-8"><Skeleton className="h-40 w-full" /></CardContent></Card>
      ) : !hasAccounts ? (
        <Card className="glass">
          <CardContent className="py-12">
            <Empty>
              <EmptyMedia variant="icon"><Building2 className="h-6 w-6" /></EmptyMedia>
              <EmptyTitle>No bank accounts connected</EmptyTitle>
              <EmptyDescription>
                Connect your bank account to automatically sync transactions, track balances, and get better insights.
              </EmptyDescription>
              <EmptyContent>
                <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Connect a Bank Account</Button>
                  </DialogTrigger>
                  <ConnectDialogContent />
                </Dialog>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Connected Accounts</CardTitle>
              <CardDescription>{accounts.length} of {MAX_ACCOUNTS} accounts connected</CardDescription>
            </div>
            {canAddMore && (
              <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Add Account</Button>
                </DialogTrigger>
                <ConnectDialogContent />
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Bank</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const needsReauth = account.syncStatus === 'NeedsReauth' || account.syncStatus === 2
                    return (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{account.bankName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {account.accountNumber ? `****${account.accountNumber.slice(-4)}` : '—'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatNaira(account.balanceNaira)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {account.lastSyncedAtUtc ? formatDateTime(account.lastSyncedAtUtc) : 'Never'}
                            </span>
                            {needsReauth && (
                              <Badge variant="secondary" className="bg-warning/20 text-warning">Needs Reauth</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {needsReauth ? (
                              <Button variant="outline" size="sm" onClick={() => openConnectWidget(account.id)}>
                                Reauthenticate
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSync(account.id)}
                                disabled={syncingId === account.id}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${syncingId === account.id ? 'animate-spin' : ''}`} />
                                {syncingId === account.id ? 'Syncing...' : 'Sync'}
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Unlink className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to disconnect your {account.bankName} account?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDisconnect(account.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Disconnect
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
