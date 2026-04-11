import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  getGoals,
  getGoalInsights,
  getWallets,
  deleteGoal,
} from '../services/personalFinanceApi';
import type { PersonalGoalDto, GoalInsightsDto, PersonalWalletDto } from '../types/financeTypes';
import GoalCard from '../components/GoalCard';
import AddGoalSheet from '../components/AddGoalSheet';
import ContributeToGoalDialog from '../components/ContributeToGoalDialog';
import GoalInsightsPanel from '../components/GoalInsightsPanel';
import GoalProgressChart from '../components/GoalProgressChart';
import GoalBreakdownPie from '../components/GoalBreakdownPie';
import { toast } from 'sonner';
import { maskAmount } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GoalsPage() {
  const { isPrivate } = usePrivacy();
  const [goals, setGoals] = useState<PersonalGoalDto[]>([]);
  const [insights, setInsights] = useState<GoalInsightsDto | null>(null);
  const [wallets, setWallets] = useState<PersonalWalletDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<PersonalGoalDto | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<PersonalGoalDto | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalList, goalInsights, walletList] = await Promise.all([
        getGoals(),
        getGoalInsights(),
        getWallets(),
      ]);
      setGoals(goalList);
      setInsights(goalInsights);
      setWallets(walletList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const walletMap = useMemo(
    () => new Map(wallets.map((w) => [w.id, w.name])),
    [wallets]
  );

  async function handleDelete() {
    if (!deleteTarget || !deletePin) return;
    setDeleting(true);
    try {
      await deleteGoal(deleteTarget.id, deletePin);
      setGoals((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      const fresh = await getGoalInsights();
      setInsights(fresh);
      toast.success('Goal deleted');
      setDeleteTarget(null);
      setDeletePin('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete goal');
    } finally {
      setDeleting(false);
    }
  }

  const totalTarget = insights?.totalTargetNaira ?? 0;
  const totalSaved = insights?.totalSavedNaira ?? 0;
  const goalsOnTrack = insights?.goalsOnTrack ?? 0;
  const totalGoals = insights?.totalActiveGoals ?? 0;
  const nextDeadline = insights?.nextDeadline;
  const nextDeadlineName = insights?.nextDeadlineGoalName;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 pt-0 gap-4">
      <div className="shrink-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
            <p className="text-muted-foreground text-sm">Track savings goals and your progress toward them.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Goal
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Total Target</p>
                  <p className="text-xl font-bold">{maskAmount(totalTarget, isPrivate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{totalGoals} active goal{totalGoals !== 1 ? 's' : ''}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Total Saved</p>
                  <p className="text-xl font-bold text-success">{maskAmount(totalSaved, isPrivate)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : '0'}% overall
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Goals On Track</p>
                  <p className="text-xl font-bold">{goalsOnTrack}<span className="text-sm text-muted-foreground">/{totalGoals}</span></p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalGoals > 0 ? ((goalsOnTrack / totalGoals) * 100).toFixed(0) : '0'}% on schedule
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Next Deadline</p>
                  {nextDeadline ? (
                    <>
                      <p className="text-sm font-bold truncate">{nextDeadlineName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{fmtDate(nextDeadline)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">None</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="goals" className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="flex-1 overflow-y-auto mt-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <Card>
              <CardContent className="flex h-48 flex-col items-center justify-center gap-3">
                <p className="text-sm font-medium text-muted-foreground">No goals yet</p>
                <Button size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add your first goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  walletName={goal.walletId ? walletMap.get(goal.walletId) : undefined}
                  onContribute={setContributeGoal}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="flex-1 overflow-y-auto mt-4">
          {loading || !insights ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <GoalInsightsPanel insights={insights} />
          )}
        </TabsContent>

        <TabsContent value="charts" className="flex-1 overflow-y-auto mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GoalProgressChart goals={goals} />
            <GoalBreakdownPie goals={goals} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Sheets & Dialogs */}
      <AddGoalSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(goal) => {
          setGoals((prev) => [...prev, goal]);
          load();
        }}
        wallets={wallets}
      />

      <ContributeToGoalDialog
        goal={contributeGoal}
        onClose={() => setContributeGoal(null)}
        onSuccess={load}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeletePin(''); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
              Enter your PIN to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="deletePin">PIN</Label>
            <Input
              id="deletePin"
              type="password"
              placeholder="Enter PIN"
              value={deletePin}
              onChange={(e) => setDeletePin(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(); }}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteTarget(null); setDeletePin(''); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || !deletePin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Goal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
