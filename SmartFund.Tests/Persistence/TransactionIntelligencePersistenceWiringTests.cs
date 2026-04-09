using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Persistence.DbContext;
using Xunit;

namespace SmartFund.Tests.Persistence
{
    public sealed class TransactionIntelligencePersistenceWiringTests
    {
        [Fact]
        public async Task DbContext_and_repositories_are_wired_for_transaction_intelligence_entities()
        {
            var options = new DbContextOptionsBuilder<SmartFundDbContext>()
                .UseInMemoryDatabase($"ti-wiring-{Guid.NewGuid():N}")
                .Options;

            await using var db = new SmartFundDbContext(options);

            db.AiInsights.ShouldNotBeNull();
            db.BankStatementUploads.ShouldNotBeNull();
            db.RecurringPatterns.ShouldNotBeNull();

            var ai = AiInsight.Create(123, "{\"insights\":[]}", DateTime.UtcNow);
            var upload = BankStatementUpload.Create(123, "statement.pdf", "PDF", DateTime.UtcNow);
            var pattern = RecurringPattern.Create(
                userId: 123,
                description: "NETFLIX",
                averageAmount: 15000m,
                frequency: "monthly",
                category: "subscriptions",
                patternType: SmartFund.Domain.PersonalFinance.Enums.RecurringPatternType.RecurringExpense,
                firstSeen: DateTime.UtcNow.AddMonths(-3),
                lastSeen: DateTime.UtcNow,
                occurrenceCount: 3,
                detectedAtUtc: DateTime.UtcNow);

            await db.AiInsights.AddAsync(ai, CancellationToken.None);
            await db.BankStatementUploads.AddAsync(upload, CancellationToken.None);
            await db.RecurringPatterns.AddAsync(pattern, CancellationToken.None);
            await db.SaveChangesAsync(CancellationToken.None);
        }
    }

    internal static class AssertEx
    {
        public static void ShouldNotBeNull<T>(this T? value) where T : class
        {
            Assert.NotNull(value);
        }
    }
}
