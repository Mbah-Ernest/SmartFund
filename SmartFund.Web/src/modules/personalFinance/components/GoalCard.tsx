import { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Target, Wallet, Trash2 } from 'lucide-react';
import type { PersonalGoalDto } from '../types/financeTypes';
import { cn, maskAmount } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';

interface Props {
  goal: PersonalGoalDto;
  walletName?: string;
  onContribute: (goal: PersonalGoalDto) => void;
  onDelete: (goal: PersonalGoalDto) => void;
}

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function GoalCard({ goal, walletName, onContribute, onDelete }: Props) {
  const { isPrivate } = usePrivacy();
  const [displayPct, setDisplayPct] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const timer = setTimeout(() => setDisplayPct(goal.progressPct), 50);
    return () => clearTimeout(timer);
  }, [goal.progressPct]);

  const days = daysUntil(goal.deadline);
  const isOverdue = days < 0;
  const isDueSoon = !isOverdue && days <= 90;
  const isOnTrack = !isOverdue && displayPct > 0;

  const borderClass = isOverdue
    ? 'border-l-4 border-l-destructive'
    : isDueSoon
      ? 'border-l-4 border-l-amber-400'
      : 'border-l-4 border-l-emerald-500';

  const progressColor = isOverdue
    ? 'bg-destructive'
    : isDueSoon
      ? 'bg-amber-400'
      : 'bg-emerald-500';

  return (
    <Card className={cn('transition-all', borderClass)}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm truncate">{goal.name}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {goal.isWalletLinked && (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1">
                <Wallet className="h-3 w-3" />
                {walletName ?? 'Linked Wallet'}
              </Badge>
            )}
            {isOverdue ? (
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">Overdue</Badge>
            ) : isDueSoon ? (
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">Due Soon</Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">{fmtDate(goal.deadline)}</Badge>
            )}
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xl font-bold">{maskAmount(goal.effectiveSavedAmount, isPrivate)}</span>
          <span className="text-xs text-muted-foreground">of {maskAmount(goal.targetAmount, isPrivate)}</span>
        </div>

        {/* Animated progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted mb-3">
          <div
            className={cn('h-full rounded-full transition-all duration-700 ease-out', progressColor)}
            style={{ width: `${Math.min(displayPct, 100)}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-4">
          <div>
            <p className="font-medium text-foreground">{maskAmount(goal.remainingAmount, isPrivate)}</p>
            <p>Remaining</p>
          </div>
          <div>
            <p className="font-medium text-foreground">{goal.progressPct.toFixed(1)}%</p>
            <p>Complete</p>
          </div>
          <div>
            <p className={cn('font-medium', isOverdue ? 'text-destructive' : 'text-foreground')}>
              {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d left`}
            </p>
            <p>Deadline</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {goal.isWalletLinked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" disabled>
                    Contribute
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Make a wallet transfer to {walletName ? `₦${walletName}` : 'the linked wallet'} instead
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button size="sm" onClick={() => onContribute(goal)}>
              Contribute
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(goal)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
