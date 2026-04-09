import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface HeroBannerProps {
  totalBalance: string;
  balanceSubtitle?: string;
  loading: boolean;
  onRefresh: () => void;
  isPrivate: boolean;
}

export default function HeroBanner({
  totalBalance,
  balanceSubtitle,
  loading,
  onRefresh,
  isPrivate,
}: HeroBannerProps) {
  const subtitlePills = balanceSubtitle ? balanceSubtitle.split(' · ') : [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between py-4 sm:py-6">
        {/* Left: balance */}
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            Total Balance
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-10 w-48 rounded-xl" />
          ) : (
            <p className="mt-1 text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums">
              {isPrivate ? '••••••' : totalBalance}
            </p>
          )}
          {subtitlePills.length > 0 && !loading && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {subtitlePills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {isPrivate ? '••••' : pill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: actions (sm+) */}
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Decorative separator */}
      <div className="h-px bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />
    </div>
  );
}
