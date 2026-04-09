'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatNaira } from '@/lib/utils'
import api from '@/lib/apiClient'

type TransactionType = 'Income' | 'Expense' | 'Transfer'

interface Transaction {
  id: string
  date: string
  description: string
  walletName: string
  categoryName: string
  amount: number
  transactionType: TransactionType
}

function getTransactionIcon(type: TransactionType) {
  switch (type) {
    case 'Income':
      return <ArrowDownLeft className="h-4 w-4 text-success" />
    case 'Expense':
      return <ArrowUpRight className="h-4 w-4 text-destructive" />
    case 'Transfer':
      return <ArrowLeftRight className="h-4 w-4 text-primary" />
  }
}

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)

  useEffect(() => {
    api.get('/api/personal-transactions?take=10&orderBy=date&direction=desc')
      .then(r => setTransactions(r.data ?? []))
      .catch(() => setTransactions([]))
  }, [])

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/finance/transactions">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!transactions ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background">
                      {getTransactionIcon(transaction.transactionType)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(transaction.date).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric'
                        })}</span>
                        <span>•</span>
                        <span>{transaction.walletName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-semibold text-sm",
                      transaction.transactionType === 'Income' && "text-success",
                      transaction.transactionType === 'Expense' && "text-destructive",
                      transaction.transactionType === 'Transfer' && "text-primary"
                    )}>
                      {transaction.transactionType === 'Income' ? '+' : '-'}{formatNaira(transaction.amount)}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {transaction.categoryName}
                    </Badge>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">No transactions yet</p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
