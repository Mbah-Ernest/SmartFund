using System;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class Tranche
    {
        public long Id { get; private set; } // EF

        public string TrancheCode { get; private set; } = default!;

        public long InvestorId { get; private set; }
        public long? DealId { get; private set; } // allow null for now until Deal module exists

        public decimal Principal { get; private set; } // store raw decimal in entity; ledger uses Money
        public RoiType RoiType { get; private set; }
        public decimal RoiRate { get; private set; } // e.g. 0.10 for 10%

        public DateTime StartDate { get; private set; }
        public DateTime MaturityDate { get; private set; }

        public PayoutType PayoutType { get; private set; }
        public int? NoticeDays { get; private set; } // for OnDemandWithNotice

        public EarlyWithdrawalPolicy EarlyWithdrawalPolicy { get; private set; }

        public long LiabilityAccountId { get; private set; } // links to LedgerAccount

        private Tranche() { } // EF

        private Tranche(
            string trancheCode,
            long investorId,
            long? dealId,
            decimal principal,
            RoiType roiType,
            decimal roiRate,
            DateTime startDate,
            DateTime maturityDate,
            PayoutType payoutType,
            int? noticeDays,
            EarlyWithdrawalPolicy earlyWithdrawalPolicy)
        {
            if (string.IsNullOrWhiteSpace(trancheCode))
                throw new DomainException("TrancheCode is required.");

            if (investorId <= 0)
                throw new DomainException("InvestorId must be valid.");

            if (principal <= 0)
                throw new DomainException("Principal must be greater than zero.");

            if (roiRate < 0)
                throw new DomainException("RoiRate cannot be negative.");

            if (maturityDate <= startDate)
                throw new DomainException("MaturityDate must be after StartDate.");

            if (payoutType == PayoutType.OnDemandWithNotice && (!noticeDays.HasValue || noticeDays.Value <= 0))
                throw new DomainException("NoticeDays is required for OnDemandWithNotice payouts.");

            TrancheCode = trancheCode.Trim();
            InvestorId = investorId;
            DealId = dealId;
            Principal = principal;
            RoiType = roiType;
            RoiRate = roiRate;
            StartDate = startDate.Date;
            MaturityDate = maturityDate.Date;
            PayoutType = payoutType;
            NoticeDays = payoutType == PayoutType.OnDemandWithNotice ? noticeDays : null;
            EarlyWithdrawalPolicy = earlyWithdrawalPolicy;
        }

        public static Tranche Create(
            string trancheCode,
            long investorId,
            long? dealId,
            decimal principal,
            RoiType roiType,
            decimal roiRate,
            DateTime startDate,
            DateTime maturityDate,
            PayoutType payoutType,
            int? noticeDays,
            EarlyWithdrawalPolicy earlyWithdrawalPolicy)
            => new Tranche(trancheCode, investorId, dealId, principal, roiType, roiRate, startDate, maturityDate, payoutType, noticeDays, earlyWithdrawalPolicy);

        public void SetLiabilityAccount(long accountId)
        {
            if (accountId <= 0) throw new DomainException("LiabilityAccountId must be valid.");
            LiabilityAccountId = accountId;
        }
    }
}