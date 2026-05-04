import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { bulkImportPrices } from '../services/stocksApi';
import { toast } from 'sonner';

interface BulkImportButtonProps {
  ticker: string;
  onImported: () => void;
}

export default function BulkImportButton({ ticker, onImported }: BulkImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProgress(0);
    try {
      const result = await bulkImportPrices(ticker, file, setProgress);
      toast.success(`Imported ${result.imported} new + updated ${result.updated} entries.`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} rows had errors.`);
      }
      onImported();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => fileInputRef.current?.click()}
        disabled={progress !== null}
      >
        <Upload className="h-3 w-3 mr-1" />
        {progress !== null ? `Uploading ${progress}%…` : 'Bulk Import CSV'}
      </Button>
      {progress !== null && <Progress value={progress} className="h-1" />}
      <p className="text-xs text-muted-foreground">
        CSV format: <code>date,open,high,low,close,volume</code>
      </p>
    </div>
  );
}
