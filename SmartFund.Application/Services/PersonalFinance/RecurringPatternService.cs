using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class RecurringPatternService
    {
        private readonly IPersonalTransactionRepository _txRepo;
        private readonly IRecurringPatternRepository _patternRepo;

        public RecurringPatternService(
            IPersonalTransactionRepository txRepo,
            IRecurringPatternRepository patternRepo)
        {
            _txRepo = txRepo;
            _patternRepo = patternRepo;
        }

        public async Task DetectAndSaveAsync(long userId, CancellationToken ct)
        {
            var transactions = await _txRepo.ListByUserAndDateRangeAsync(userId, DateTime.UtcNow.AddYears(-1), DateTime.UtcNow, ct);
            if (transactions.Count < 3) return;

            await _patternRepo.DeleteAllForUserAsync(userId, ct);

            // Group by normalized description (first 40 chars, uppercased, trimmed)
            var groups = transactions
                .Where(t => t.TransactionType == PersonalTransactionType.Expense || t.TransactionType == PersonalTransactionType.Income)
                .GroupBy(t => NormalizeDescription(t.Description))
                .Where(g => g.Count() >= 3)
                .ToList();

            var now = DateTime.UtcNow;
            foreach (var g in groups)
            {
                var list = g.OrderBy(t => t.Date).ToList();
                var avgAmount = list.Average(t => t.Amount);
                var minAmount = list.Min(t => t.Amount);
                var maxAmount = list.Max(t => t.Amount);

                // Check ±20% amount variance
                if (minAmount < avgAmount * 0.8m || maxAmount > avgAmount * 1.2m) continue;

                var frequency = DetectFrequency(list);
                var patternType = list.All(t => t.TransactionType == PersonalTransactionType.Income)
                    ? RecurringPatternType.RecurringIncome
                    : RecurringPatternType.RecurringExpense;

                var pattern = RecurringPattern.Create(
                    userId,
                    g.Key,
                    avgAmount,
                    frequency,
                    "auto-detected",
                    patternType,
                    list.First().Date,
                    list.Last().Date,
                    list.Count,
                    now);

                await _patternRepo.AddAsync(pattern, ct);
            }

            await _patternRepo.SaveChangesAsync(ct);
        }

        private static string NormalizeDescription(string? desc)
        {
            if (string.IsNullOrWhiteSpace(desc)) return "UNKNOWN";
            var upper = desc.Trim().ToUpperInvariant();
            return upper.Length > 40 ? upper[..40] : upper;
        }

        private static string DetectFrequency(List<PersonalTransaction> ordered)
        {
            if (ordered.Count < 2) return "irregular";

            var gaps = new List<double>();
            for (int i = 1; i < ordered.Count; i++)
                gaps.Add((ordered[i].Date - ordered[i - 1].Date).TotalDays);

            var avgGap = gaps.Average();

            if (avgGap >= 25 && avgGap <= 35) return "monthly";
            if (avgGap >= 6 && avgGap <= 8) return "weekly";
            if (avgGap >= 13 && avgGap <= 15) return "biweekly";
            return "irregular";
        }
    }
}
