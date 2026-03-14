using System;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class BankCategorizationRule
    {
        public long Id { get; private set; }

        /// <summary>Keyword or regex pattern matched against NormalizedNarration.</summary>
        public string MatchText { get; private set; } = default!;

        public bool IsRegex { get; private set; }
        public bool CaseSensitive { get; private set; }

        public long CategoryId { get; private set; }
        public PersonalTransactionType TransactionType { get; private set; }

        /// <summary>Lower value = evaluated first. User-created rules default to 100.</summary>
        public int Priority { get; private set; }

        public bool IsActive { get; private set; }

        /// <summary>Optional user-facing label, e.g. "KUDA transfers".</summary>
        public string? Description { get; private set; }

        /// <summary>When true, credits that match this rule are auto-posted (opt-in).</summary>
        public bool AutoPostCredits { get; private set; }

        public DateTime CreatedAtUtc { get; private set; }
        public DateTime? LastMatchedAtUtc { get; private set; }
        public int MatchCount { get; private set; }

        private BankCategorizationRule() { } // EF

        public static BankCategorizationRule Create(
            string matchText,
            bool isRegex,
            bool caseSensitive,
            long categoryId,
            PersonalTransactionType transactionType,
            int priority,
            string? description,
            bool autoPostCredits,
            DateTime utcNow)
        {
            if (string.IsNullOrWhiteSpace(matchText))
                throw new DomainException("MatchText is required.");
            if (categoryId <= 0)
                throw new DomainException("CategoryId must be a positive value.");
            if (priority < 0)
                throw new DomainException("Priority must be zero or greater.");

            return new BankCategorizationRule
            {
                MatchText = matchText.Trim(),
                IsRegex = isRegex,
                CaseSensitive = caseSensitive,
                CategoryId = categoryId,
                TransactionType = transactionType,
                Priority = priority,
                Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
                AutoPostCredits = autoPostCredits,
                IsActive = true,
                CreatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc),
                MatchCount = 0
            };
        }

        public void RecordMatch(DateTime utcNow)
        {
            MatchCount++;
            LastMatchedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        }

        public void UpdatePriority(int priority)
        {
            if (priority < 0)
                throw new DomainException("Priority must be zero or greater.");
            Priority = priority;
        }

        public void Update(string matchText, bool isRegex, bool caseSensitive, long categoryId,
            PersonalTransactionType transactionType, string? description, bool autoPostCredits)
        {
            if (string.IsNullOrWhiteSpace(matchText))
                throw new DomainException("MatchText is required.");
            if (categoryId <= 0)
                throw new DomainException("CategoryId must be a positive value.");

            MatchText = matchText.Trim();
            IsRegex = isRegex;
            CaseSensitive = caseSensitive;
            CategoryId = categoryId;
            TransactionType = transactionType;
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
            AutoPostCredits = autoPostCredits;
        }

        public void Deactivate() => IsActive = false;
        public void Activate() => IsActive = true;
    }
}
