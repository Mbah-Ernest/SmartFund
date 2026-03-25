import { useEffect, useState } from 'react';
import type { PendingActionSummary } from '../../services/agentApi';
import { confirmAction, cancelAction } from '../../services/agentApi';

interface Props {
  pendingAction: PendingActionSummary;
  onConfirmed: (message: string) => void;
  onCancelled: () => void;
}

export default function ConfirmActionCard({ pendingAction, onConfirmed, onCancelled }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(pendingAction.expiresInSeconds);
  const [loading, setLoading] = useState<'confirm' | 'cancel' | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [done, secondsLeft]);

  const expired = secondsLeft <= 0;
  const disabled = loading !== null || expired || done;

  const handleConfirm = async () => {
    setLoading('confirm');
    try {
      const result = await confirmAction(pendingAction.pendingActionId);
      setDone(true);
      onConfirmed(result.message);
    } catch (e: unknown) {
      setLoading(null);
      onConfirmed(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleCancel = async () => {
    setLoading('cancel');
    try {
      await cancelAction(pendingAction.pendingActionId);
    } catch {
      // ignore — may already be gone
    }
    setDone(true);
    onCancelled();
  };

  return (
    <div className="mt-3 border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-yellow-500 text-lg">⚠️</span>
        <div className="flex-1">
          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
            Confirm Action
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            {pendingAction.summary}
          </p>
        </div>
      </div>

      {!done && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirm}
            disabled={disabled}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded font-medium transition-colors"
          >
            {loading === 'confirm' ? 'Confirming…' : 'Confirm'}
          </button>
          <button
            onClick={handleCancel}
            disabled={disabled}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded font-medium transition-colors"
          >
            {loading === 'cancel' ? 'Cancelling…' : 'Cancel'}
          </button>
          {secondsLeft > 0 && secondsLeft <= 60 && (
            <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">
              Expires in {secondsLeft}s
            </span>
          )}
          {expired && (
            <span className="text-xs text-red-500 ml-2">Expired</span>
          )}
        </div>
      )}
    </div>
  );
}
