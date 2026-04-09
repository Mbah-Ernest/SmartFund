import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CreditCard, Pencil, Trash2 } from 'lucide-react';
import type { PersonalDebtDto, RankedDebt } from '../types/financeTypes';
import { cn, maskAmount, maskName } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';

interface Props {
  debt: PersonalDebtDto;
  urgency?: RankedDebt;
  onRecordPayment: (debt: PersonalDebtDto) => void;
  onEdit: (debt: PersonalDebtDto) => void;
  onDelete: (debt: PersonalDebtDto) => void;
  onForgive: (debt: PersonalDebtDto) => void;
}

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function urgencyColor(badge: string) {
  switch (badge) {
    case 'Overdue': return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'Critical': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
    case 'Soon': return 'bg-warning/10 text-warning border-warning/30';
    case 'Upcoming': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'PaidOff': return 'bg-success/10 text-success border-success/30';
    case 'Forgiven': return 'bg-muted text-muted-foreground';
    default: return 'bg-primary/10 text-primary border-primary/30';
  }
}

export default function DebtCard({ debt, urgency, onRecordPayment, onEdit, onDelete, onForgive }: Props) {
  const [showPayments, setShowPayments] = useState(false);
  const { isPrivate } = usePrivacy();
  const [displayPct, setDisplayPct] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const timer = setTimeout(() => setDisplayPct(debt.progressPercent), 50);
    return () => clearTimeout(timer);
  }, [debt.progressPercent]);

  const isPaid = debt.status === 'PaidOff';
  const isActive = debt.status === 'Active';

  const isOverdue = isActive && debt.daysUntilDue < 0;
  const isDueSoon = isActive && debt.daysUntilDue >= 0 && debt.daysUntilDue <= 7;

  const borderClass = isOverdue
    ? 'border-l-4 border-l-destructive'
    : isDueSoon
      ? 'border-l-4 border-l-yellow-400'
      : 'border-l-4 border-l-emerald-500';

  const bgClass = isOverdue ? 'bg-destructive/5' : '';

  return (
    <Card className={cn('transition-all', isPaid && 'opacity-75', borderClass, bgClass)}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm truncate">{maskName(debt.creditorName, isPrivate)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {urgency && isActive && (
              <Badge variant="outline" className={cn('text-xs font-medium', urgencyColor(urgency.urgencyBadge))}>
                {urgency.urgencyBadge}
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-xs', statusColor(debt.status))}>
              {debt.status === 'PaidOff' ? 'Paid Off' : debt.status}
            </Badge>
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xl font-bold">{maskAmount(debt.remainingBalance, isPrivate)}</span>
          <span className="text-xs text-muted-foreground">of {maskAmount(debt.totalAmountDue, isPrivate)}</span>
        </div>

        {/* Animated progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted mb-3">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700 ease-out',
              isOverdue ? 'bg-destructive' : isDueSoon ? 'bg-yellow-400' : 'bg-emerald-500'
            )}
            style={{ width: `${Math.min(displayPct, 100)}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-4">
          <div>
            <p className="font-medium text-foreground">{maskAmount(debt.totalPaid, isPrivate)}</p>
            <p>Paid</p>
          </div>
          <div>
            <p className="font-medium text-foreground">{maskAmount(debt.interestAmount, isPrivate)}</p>
            <p>Interest</p>
          </div>
          <div>
            <p className={cn('font-medium', isOverdue ? 'text-destructive' : 'text-foreground')}>
              {isOverdue
                ? `${Math.abs(debt.daysUntilDue)}d overdue`
                : debt.daysUntilDue === 0
                  ? 'Due today'
                  : `${debt.daysUntilDue}d left`}
            </p>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
              {fmtDate(debt.dueDate)}
            </span>
          </div>
        </div>

        {debt.description && (
          <p className="text-xs text-muted-foreground mb-3 italic">{debt.description}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {isActive && (
            <Button size="sm" onClick={() => onRecordPayment(debt)}>
              Record Payment
            </Button>
          )}
          {isActive && (
            <Button size="sm" variant="outline" onClick={() => onEdit(debt)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          )}
          {isActive && !isPaid && (
            <Button size="sm" variant="outline" onClick={() => onForgive(debt)}>
              Mark Forgiven
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(debt)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Payment history toggle */}
        {debt.payments.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <button
              onClick={() => setShowPayments(!showPayments)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPayments ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {debt.payments.length} payment{debt.payments.length !== 1 ? 's' : ''}
            </button>
            {showPayments && (
              <div className="mt-2 flex flex-col gap-1.5">
                {debt.payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{fmtDate(p.paidOn)}{p.note ? ` — ${p.note}` : ''}</span>
                    <span className="font-medium text-success">{maskAmount(p.amount, isPrivate)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
