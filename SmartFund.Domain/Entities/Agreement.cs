using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class Agreement
    {
        public long Id { get; private set; } // EF

        public long TrancheId { get; private set; }
        public int Version { get; private set; }

        public string SignedName { get; private set; } = default!;
        public DateTime SignedAtUtc { get; private set; }
        public string DocumentUrl { get; private set; } = default!;

        private Agreement() { } // EF

        private Agreement(long trancheId, int version, string signedName, DateTime signedAtUtc, string documentUrl)
        {
            if (trancheId <= 0) throw new DomainException("TrancheId must be valid.");
            if (version <= 0) throw new DomainException("Version must be greater than zero.");
            if (string.IsNullOrWhiteSpace(signedName)) throw new DomainException("SignedName is required.");
            if (string.IsNullOrWhiteSpace(documentUrl)) throw new DomainException("DocumentUrl is required.");

            TrancheId = trancheId;
            Version = version;
            SignedName = signedName.Trim();
            SignedAtUtc = DateTime.SpecifyKind(signedAtUtc, DateTimeKind.Utc);
            DocumentUrl = documentUrl.Trim();
        }

        public static Agreement Create(long trancheId, int version, string signedName, DateTime signedAtUtc, string documentUrl)
            => new Agreement(trancheId, version, signedName, signedAtUtc, documentUrl);
    }
}
