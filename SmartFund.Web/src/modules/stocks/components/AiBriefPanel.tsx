import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAiBrief, regenerateBrief } from '../services/stocksApi';
import type { AiBriefDto } from '../types/stockTypes';

interface AiBriefPanelProps {
  ticker: string;
  pollTrigger?: number;
}

function rsiVariant(signal?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!signal) return 'secondary';
  if (signal.toLowerCase().includes('oversold')) return 'default';
  if (signal.toLowerCase().includes('overbought')) return 'destructive';
  return 'secondary';
}

function macdVariant(signal?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!signal) return 'secondary';
  if (signal.toLowerCase().includes('bullish')) return 'default';
  if (signal.toLowerCase().includes('bearish')) return 'destructive';
  return 'secondary';
}

function smaVariant(signal?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!signal) return 'secondary';
  if (signal.toLowerCase().includes('above') || signal.toLowerCase().includes('bullish')) return 'default';
  if (signal.toLowerCase().includes('below') || signal.toLowerCase().includes('bearish')) return 'destructive';
  return 'secondary';
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AiBriefPanel({ ticker, pollTrigger = 0 }: AiBriefPanelProps) {
  const [brief, setBrief] = useState<AiBriefDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const prevGeneratedAtRef = useRef<string | null>(null);

  const fetchBrief = useCallback(async () => {
    try {
      const data = await getAiBrief(ticker);
      setBrief(data);
      setError(null);
      return data;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load brief.');
      return null;
    }
  }, [ticker]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchBrief().finally(() => setLoading(false));
  }, [fetchBrief]);

  // Poll after price save (pollTrigger increments)
  useEffect(() => {
    if (pollTrigger === 0) return;

    prevGeneratedAtRef.current = brief?.generatedAtUtc ?? null;
    pollCountRef.current = 0;
    setGenerating(true);

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current++;
      const updated = await fetchBrief();

      const isNew = updated?.generatedAtUtc &&
        updated.generatedAtUtc !== prevGeneratedAtRef.current;

      if (isNew || pollCountRef.current >= 24) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        setGenerating(false);
      }
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollTrigger]);

  async function handleRegenerate() {
    setRegenerating(true);
    prevGeneratedAtRef.current = brief?.generatedAtUtc ?? null;
    try {
      await regenerateBrief(ticker);
      setGenerating(true);
      pollCountRef.current = 0;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        pollCountRef.current++;
        const updated = await fetchBrief();
        const isNew = updated?.generatedAtUtc && updated.generatedAtUtc !== prevGeneratedAtRef.current;
        if (isNew || pollCountRef.current >= 24) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          setGenerating(false);
        }
      }, 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request regeneration.');
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription className="text-xs">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!brief) {
    return (
      <div className="p-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          No AI brief yet. Add price entries to generate one.
        </p>
        {generating && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating brief…
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {generating ? (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating…
            </span>
          ) : (
            `Updated ${timeAgo(brief.generatedAtUtc)}`
          )}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={regenerating || generating}
          onClick={handleRegenerate}
        >
          <RefreshCw className={`h-3 w-3 ${regenerating ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">RSI:</span>
            <Badge variant={rsiVariant(brief.rsiSignal)} className="text-xs h-5 px-1.5">
              {brief.rsiValue ? `${brief.rsiValue.toFixed(1)} · ` : ''}{brief.rsiSignal}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">MACD:</span>
            <Badge variant={macdVariant(brief.macdSignal)} className="text-xs h-5 px-1.5">
              {brief.macdSignal}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">SMA20:</span>
            <Badge variant={smaVariant(brief.priceVsSma20)} className="text-xs h-5 px-1.5">
              {brief.priceVsSma20.replace(' (bullish)', '').replace(' (bearish)', '')}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">SMA50:</span>
            <Badge variant={smaVariant(brief.priceVsSma50)} className="text-xs h-5 px-1.5">
              {brief.priceVsSma50.replace(' (bullish)', '').replace(' (bearish)', '')}
            </Badge>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-sm leading-relaxed">{brief.briefText}</p>
      </div>
    </div>
  );
}
