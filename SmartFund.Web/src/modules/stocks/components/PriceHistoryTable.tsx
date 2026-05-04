import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNaira } from '@/lib/utils';
import type { PriceEntryDto } from '../types/stockTypes';
import { savePrice, deletePrice } from '../services/stocksApi';
import { toast } from 'sonner';

interface PriceHistoryTableProps {
  ticker: string;
  entries: PriceEntryDto[];
  onRefresh: () => void;
}

interface EditState {
  id: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export default function PriceHistoryTable({ ticker, entries, onRefresh }: PriceHistoryTableProps) {
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function startEdit(entry: PriceEntryDto) {
    setEditState({
      id: entry.id,
      open: entry.open.toString(),
      high: entry.high.toString(),
      low: entry.low.toString(),
      close: entry.close.toString(),
      volume: entry.volume.toString(),
    });
  }

  async function saveEdit(entry: PriceEntryDto) {
    if (!editState) return;
    setSaving(true);
    try {
      await savePrice({
        ticker,
        date: entry.tradeDate,
        open: parseFloat(editState.open),
        high: parseFloat(editState.high),
        low: parseFloat(editState.low),
        close: parseFloat(editState.close),
        volume: parseInt(editState.volume, 10),
      });
      toast.success('Price entry updated.');
      setEditState(null);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update entry.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await deletePrice(id);
      toast.success('Price entry deleted.');
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete entry.');
    } finally {
      setDeletingId(null);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No price entries yet. Add the first one above.
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Open</TableHead>
            <TableHead className="text-right">High</TableHead>
            <TableHead className="text-right">Low</TableHead>
            <TableHead className="text-right">Close</TableHead>
            <TableHead className="text-right">Volume</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const isEditing = editState?.id === entry.id;
            return (
              <TableRow key={entry.id}>
                <TableCell className="font-mono text-xs">{entry.tradeDate}</TableCell>
                {isEditing ? (
                  <>
                    {(['open', 'high', 'low', 'close'] as const).map((field) => (
                      <TableCell key={field} className="p-1">
                        <Input
                          className="h-7 w-24 text-right text-xs"
                          value={editState[field]}
                          onChange={(e) => setEditState((s) => s && { ...s, [field]: e.target.value })}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="p-1">
                      <Input
                        className="h-7 w-24 text-right text-xs"
                        value={editState.volume}
                        onChange={(e) => setEditState((s) => s && { ...s, volume: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="p-1">
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={saving}
                          onClick={() => saveEdit(entry)}
                        >
                          <Check className="h-3 w-3 text-green-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditState(null)}
                        >
                          <X className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-right text-xs">{formatNaira(entry.open)}</TableCell>
                    <TableCell className="text-right text-xs">{formatNaira(entry.high)}</TableCell>
                    <TableCell className="text-right text-xs">{formatNaira(entry.low)}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{formatNaira(entry.close)}</TableCell>
                    <TableCell className="text-right text-xs">{entry.volume.toLocaleString()}</TableCell>
                    <TableCell className="p-1">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => startEdit(entry)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          disabled={deletingId === entry.id}
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
