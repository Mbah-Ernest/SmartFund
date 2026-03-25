using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Agent
{
    /// <summary>
    /// A short-lived (5-minute) record of an AI-proposed action (transfer, create budget)
    /// waiting for explicit user confirmation before it executes.
    /// </summary>
    public sealed class PendingAgentAction
    {
        public Guid Id { get; private set; }
        public string UserId { get; private set; } = default!;

        /// <summary>"Transfer" or "CreateBudget"</summary>
        public string ActionType { get; private set; } = default!;

        /// <summary>JSON-serialized payload specific to ActionType.</summary>
        public string PayloadJson { get; private set; } = default!;

        /// <summary>Human-readable sentence shown in the confirmation card.</summary>
        public string Summary { get; private set; } = default!;

        public DateTime CreatedAtUtc { get; private set; }
        public DateTime ExpiresAtUtc { get; private set; }

        private PendingAgentAction() { } // EF

        private PendingAgentAction(
            Guid id,
            string userId,
            string actionType,
            string payloadJson,
            string summary,
            DateTime createdAtUtc)
        {
            if (string.IsNullOrWhiteSpace(userId))
                throw new DomainException("UserId is required.");
            if (string.IsNullOrWhiteSpace(actionType))
                throw new DomainException("ActionType is required.");
            if (string.IsNullOrWhiteSpace(payloadJson))
                throw new DomainException("Payload is required.");
            if (string.IsNullOrWhiteSpace(summary))
                throw new DomainException("Summary is required.");

            Id = id;
            UserId = userId;
            ActionType = actionType;
            PayloadJson = payloadJson;
            Summary = summary;
            CreatedAtUtc = DateTime.SpecifyKind(createdAtUtc, DateTimeKind.Utc);
            ExpiresAtUtc = DateTime.SpecifyKind(createdAtUtc.AddMinutes(5), DateTimeKind.Utc);
        }

        public static PendingAgentAction Create(
            string userId,
            string actionType,
            string payloadJson,
            string summary,
            DateTime utcNow) =>
            new PendingAgentAction(Guid.NewGuid(), userId, actionType, payloadJson, summary, utcNow);

        public bool IsExpired(DateTime utcNow) => utcNow >= ExpiresAtUtc;
    }
}
