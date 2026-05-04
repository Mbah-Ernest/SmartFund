import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { savePrice } from '../services/stocksApi';
import { toast } from 'sonner';

interface ManualPriceEntryProps {
  ticker: string;
  onSaved: () => void;
  onBriefPending: () => void;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function ManualPriceEntry({ ticker, onSaved, onBriefPending }: ManualPriceEntryProps) {
  const [date, setDate] = useState(today);
  const [open, setOpen] = useState('');
  const [high, setHigh] = useState('');
  const [low, setLow] = useState('');
  const [close, setClose] = useState('');
  const [volume, setVolume] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    const o = parseFloat(open), h = parseFloat(high), l = parseFloat(low), c = parseFloat(close), v = parseInt(volume, 10);
    if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c)) return 'All OHLC values must be numeric.';
    if (h < l) return 'High must be ≥ Low.';
    if (c < l || c > h) return 'Close must be between Low and High.';
    if (o <= 0 || h <= 0 || l <= 0 || c <= 0) return 'OHLC values must be positive.';
    if (isNaN(v) || v < 0) return 'Volume must be a non-negative integer.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    setSubmitting(true);
    try {
      await savePrice({
        ticker,
        date,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseInt(volume, 10),
      });
      toast.success('Price saved. Generating AI brief…');
      onSaved();
      onBriefPending();
      // Reset to today, keep other fields for quick re-entry
      setDate(today());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save price.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-8 text-sm"
          />
        </div>

        {[
          { label: 'Open', value: open, setter: setOpen },
          { label: 'High', value: high, setter: setHigh },
          { label: 'Low', value: low, setter: setLow },
          { label: 'Close', value: close, setter: setClose },
        ].map(({ label, value, setter }) => (
          <div key={label}>
            <Label className="text-xs">{label} (₦)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder="0.00"
              required
              className="h-8 text-sm"
            />
          </div>
        ))}

        <div className="col-span-2">
          <Label className="text-xs">Volume</Label>
          <Input
            type="number"
            step="1"
            min="0"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="0"
            required
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Button type="submit" size="sm" disabled={submitting} className="w-full">
        {submitting ? 'Saving…' : 'Save & Analyse'}
      </Button>
    </form>
  );
}
