using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class AiInsight
    {
        public long Id { get; private set; }
        public long UserId { get; private set; }
        public string InsightsJson { get; private set; } = default!;
        public DateTime GeneratedAtUtc { get; private set; }
        public DateTime ExpiresAtUtc { get; private set; }

        private AiInsight() { }

        public static AiInsight Create(long userId, string insightsJson, DateTime generatedAtUtc)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (string.IsNullOrWhiteSpace(insightsJson))
                throw new DomainException("InsightsJson is required.");

            return new AiInsight
            {
                UserId = userId,
                InsightsJson = insightsJson,
                GeneratedAtUtc = DateTime.SpecifyKind(generatedAtUtc, DateTimeKind.Utc),
                ExpiresAtUtc = DateTime.SpecifyKind(generatedAtUtc.AddHours(6), DateTimeKind.Utc)
            };
        }
    }
}
