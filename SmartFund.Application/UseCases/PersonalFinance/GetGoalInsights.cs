using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class GetGoalInsights
    {
        private readonly IPersonalGoalRepository _goals;
        private readonly IPersonalWalletService _wallets;

        public GetGoalInsights(IPersonalGoalRepository goals, IPersonalWalletService wallets)
        {
            _goals = goals;
            _wallets = wallets;
        }

        public async Task<GoalInsightsSummary> ExecuteAsync(long userId, CancellationToken ct)
        {
            var goals = await _goals.ListByUserAsync(userId, ct);
            var utcNow = DateTime.UtcNow;

            var items = new List<GoalInsightItem>();

            foreach (var g in goals)
            {
                decimal effectiveSaved;
                if (g.WalletId.HasValue)
                {
                    try
                    {
                        effectiveSaved = await _wallets.GetWalletBalanceAsync(g.WalletId.Value, ct);
                    }
                    catch
                    {
                        effectiveSaved = g.SavedAmount;
                    }
                }
                else
                {
                    effectiveSaved = g.SavedAmount;
                }

                var progressPct = g.TargetAmount > 0
                    ? Math.Min(100m, Math.Round(effectiveSaved / g.TargetAmount * 100m, 2))
                    : 0m;

                var remaining = Math.Max(0m, g.TargetAmount - effectiveSaved);
                var isComplete = effectiveSaved >= g.TargetAmount;
                var isOverdue = !isComplete && g.Deadline <= utcNow;

                var monthsToDeadline = g.Deadline > utcNow
                    ? (decimal)Math.Ceiling((g.Deadline - utcNow).TotalDays / 30.44)
                    : 0m;

                var monthlyRequired = !isComplete && monthsToDeadline > 0
                    ? Math.Round(remaining / monthsToDeadline, 2)
                    : 0m;

                // Estimate completion date based on average monthly save rate
                // We use a simple projection: remaining / monthlyRequired
                DateTime? estimatedCompletion = null;
                if (!isComplete && monthlyRequired > 0)
                    estimatedCompletion = utcNow.AddMonths((int)Math.Ceiling((double)(remaining / monthlyRequired)));

                // IsOnTrack: if we're at or ahead of where we need to be
                var monthsElapsed = g.Deadline > utcNow
                    ? Math.Max(0, (decimal)((utcNow - g.CreatedAt).TotalDays / 30.44))
                    : 0m;
                var totalMonths = (decimal)((g.Deadline - g.CreatedAt).TotalDays / 30.44);
                var expectedPct = totalMonths > 0 ? Math.Min(100m, monthsElapsed / totalMonths * 100m) : 0m;
                var isOnTrack = !isOverdue && (progressPct >= expectedPct || isComplete);

                items.Add(new GoalInsightItem(
                    g.Id, g.Name, g.TargetAmount, effectiveSaved,
                    progressPct, monthlyRequired, estimatedCompletion,
                    isOnTrack, isOverdue, g.WalletId.HasValue, g.WalletId));
            }

            var activeItems = items.Where(i => !i.IsOverdue || i.ProgressPct < 100m).ToList();
            var totalTarget = items.Sum(i => i.TargetNaira);
            var totalSaved = items.Sum(i => i.SavedNaira);
            var overallPct = totalTarget > 0 ? Math.Min(100m, Math.Round(totalSaved / totalTarget * 100m, 2)) : 0m;
            var goalsOnTrack = items.Count(i => i.IsOnTrack);
            var overdueGoals = items.Count(i => i.IsOverdue);

            var nextDeadlineGoal = items
                .Where(i => !i.IsOverdue && i.ProgressPct < 100m)
                .OrderBy(i => i.EstimatedCompletionDate ?? DateTime.MaxValue)
                .FirstOrDefault();

            // Actually use actual deadline, not estimated
            var nextDeadlineGoalActual = goals
                .Where(g => g.Deadline > utcNow)
                .OrderBy(g => g.Deadline)
                .FirstOrDefault();

            return new GoalInsightsSummary(
                totalTarget,
                totalSaved,
                goalsOnTrack,
                items.Count,
                overdueGoals,
                overallPct,
                nextDeadlineGoalActual?.Id,
                nextDeadlineGoalActual?.Name,
                nextDeadlineGoalActual?.Deadline,
                items);
        }
    }

    public record GoalInsightsSummary(
        decimal TotalTargetNaira,
        decimal TotalSavedNaira,
        int GoalsOnTrack,
        int TotalActiveGoals,
        int OverdueGoals,
        decimal OverallProgressPct,
        long? NextDeadlineGoalId,
        string? NextDeadlineGoalName,
        DateTime? NextDeadline,
        List<GoalInsightItem> Items);

    public record GoalInsightItem(
        long GoalId,
        string Name,
        decimal TargetNaira,
        decimal SavedNaira,
        decimal ProgressPct,
        decimal MonthlyRequiredNaira,
        DateTime? EstimatedCompletionDate,
        bool IsOnTrack,
        bool IsOverdue,
        bool IsWalletLinked,
        long? WalletId);
}
