using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class AiInsightsService
    {
        private readonly IClaudeApiClient _claude;
        private readonly IAiInsightRepository _repo;
        private readonly IPersonalTransactionRepository _txRepo;
        private readonly IPersonalBudgetRepository _budgetRepo;
        private readonly IPersonalBudgetTrackingRepository _budgetTrackingRepo;
        private readonly ILogger<AiInsightsService> _logger;

        public AiInsightsService(
            IClaudeApiClient claude,
            IAiInsightRepository repo,
            IPersonalTransactionRepository txRepo,
            IPersonalBudgetRepository budgetRepo,
            IPersonalBudgetTrackingRepository budgetTrackingRepo,
            ILogger<AiInsightsService> logger)
        {
            _claude = claude;
            _repo = repo;
            _txRepo = txRepo;
            _budgetRepo = budgetRepo;
            _budgetTrackingRepo = budgetTrackingRepo;
            _logger = logger;
        }

        public async Task<string> GetOrGenerateInsightsAsync(long userId, bool forceRefresh, CancellationToken ct)
        {
            if (!forceRefresh)
            {
                var existing = await _repo.GetLatestForUserAsync(userId, ct);
                if (existing is not null && existing.ExpiresAtUtc > DateTime.UtcNow)
                    return existing.InsightsJson;
            }

            var insightsJson = await GenerateAsync(userId, ct);
            var insight = AiInsight.Create(userId, insightsJson, DateTime.UtcNow);
            await _repo.UpsertAsync(insight, ct);
            await _repo.SaveChangesAsync(ct);
            return insightsJson;
        }

        private async Task<string> GenerateAsync(long userId, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var from = now.AddMonths(-3);

            var transactions = await _txRepo.ListByUserAndDateRangeAsync(userId, from, now, ct);
            if (transactions.Count == 0)
                return DefaultEmptyInsights();

            var context = BuildContext(transactions, now);

            const string systemPrompt =
                "You are a personal finance advisor for Nigerian users. " +
                "Analyse the provided financial summary and return ONLY a JSON object with this exact shape:\n" +
                "{\"insights\":[{\"type\":\"warning|tip|observation|achievement\",\"title\":\"Short headline\",\"body\":\"2-3 sentences with actual ₦ figures\",\"action\":\"optional CTA\",\"priority\":1}]}\n" +
                "Return between 3 and 6 insights. Use actual Naira (₦) figures. No markdown, no explanation — pure JSON only.";

            try
            {
                var raw = await _claude.CompleteAsync(systemPrompt, context, ct);
                // Validate it is parseable JSON
                JsonDocument.Parse(raw);
                return raw;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Claude insights generation failed for user {UserId}", userId);
                return DefaultEmptyInsights();
            }
        }

        private static string BuildContext(List<PersonalTransaction> transactions, DateTime now)
        {
            var sb = new StringBuilder();

            // Monthly totals
            var monthlyGroups = transactions
                .GroupBy(t => new { t.Date.Year, t.Date.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .ToList();

            sb.AppendLine("=== Monthly Income vs Expenses (last 3 months) ===");
            foreach (var g in monthlyGroups)
            {
                var income = g.Where(t => t.TransactionType == Domain.PersonalFinance.Enums.PersonalTransactionType.Income).Sum(t => t.Amount);
                var expense = g.Where(t => t.TransactionType == Domain.PersonalFinance.Enums.PersonalTransactionType.Expense).Sum(t => t.Amount);
                sb.AppendLine($"{g.Key.Year}-{g.Key.Month:D2}: Income ₦{income:N0}, Expenses ₦{expense:N0}, Net ₦{income - expense:N0}");
            }

            // Small charges
            var smallCharges = transactions.Where(t => t.IsSmallCharge).ToList();
            if (smallCharges.Count > 0)
            {
                var totalSmall = smallCharges.Sum(t => t.Amount);
                sb.AppendLine($"\n=== Silent Drains (small recurring charges) ===");
                sb.AppendLine($"Total: ₦{totalSmall:N0} across {smallCharges.Count} transactions");
                foreach (var grp in smallCharges.GroupBy(t => t.SmallChargeCategory ?? "other"))
                    sb.AppendLine($"  {grp.Key}: ₦{grp.Sum(t => t.Amount):N0} ({grp.Count()} txns)");
            }

            // Top expense categories (current month)
            var currentMonth = transactions
                .Where(t => t.Date.Year == now.Year && t.Date.Month == now.Month
                         && t.TransactionType == Domain.PersonalFinance.Enums.PersonalTransactionType.Expense)
                .GroupBy(t => t.CategoryId)
                .OrderByDescending(g => g.Sum(t => t.Amount))
                .Take(5)
                .ToList();

            if (currentMonth.Count > 0)
            {
                sb.AppendLine("\n=== Top Expense Categories This Month ===");
                foreach (var g in currentMonth)
                    sb.AppendLine($"  Category {g.Key}: ₦{g.Sum(t => t.Amount):N0}");
            }

            return sb.ToString();
        }

        private static string DefaultEmptyInsights() =>
            "{\"insights\":[{\"type\":\"tip\",\"title\":\"Start tracking\",\"body\":\"Connect your bank account or add transactions to get personalised AI insights about your finances.\",\"action\":\"Connect bank\",\"priority\":1}]}";
    }
}
