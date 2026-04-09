using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class BankStatementUpload
    {
        public long Id { get; private set; }
        public long UserId { get; private set; }
        public string FileName { get; private set; } = default!;
        public string FileType { get; private set; } = default!;
        public string Status { get; private set; } = "processing";
        public int TotalTransactions { get; private set; }
        public int ParsedTransactions { get; private set; }
        public int FlaggedForReview { get; private set; }
        public int SmallChargesFound { get; private set; }
        public DateTime? DateRangeStart { get; private set; }
        public DateTime? DateRangeEnd { get; private set; }
        public string? ErrorMessage { get; private set; }
        public DateTime CreatedAtUtc { get; private set; }
        public DateTime? CompletedAtUtc { get; private set; }

        private BankStatementUpload() { }

        public static BankStatementUpload Create(long userId, string fileName, string fileType, DateTime utcNow)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (string.IsNullOrWhiteSpace(fileName))
                throw new DomainException("FileName is required.");
            if (string.IsNullOrWhiteSpace(fileType))
                throw new DomainException("FileType is required.");

            return new BankStatementUpload
            {
                UserId = userId,
                FileName = fileName.Trim(),
                FileType = fileType.Trim().ToUpperInvariant(),
                Status = "processing",
                CreatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc)
            };
        }

        public void MarkComplete(
            int total, int parsed, int flagged, int smallCharges,
            DateTime? rangeStart, DateTime? rangeEnd, DateTime utcNow)
        {
            TotalTransactions = total;
            ParsedTransactions = parsed;
            FlaggedForReview = flagged;
            SmallChargesFound = smallCharges;
            DateRangeStart = rangeStart.HasValue ? DateTime.SpecifyKind(rangeStart.Value.Date, DateTimeKind.Unspecified) : null;
            DateRangeEnd = rangeEnd.HasValue ? DateTime.SpecifyKind(rangeEnd.Value.Date, DateTimeKind.Unspecified) : null;
            Status = "complete";
            CompletedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        }

        public void MarkFailed(string error, DateTime utcNow)
        {
            Status = "failed";
            ErrorMessage = string.IsNullOrWhiteSpace(error) ? "Unknown error." : error.Trim();
            CompletedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        }
    }
}
