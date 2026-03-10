using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class PersonalInvestmentContributionService : IPersonalInvestmentContributionService
    {
        private readonly IPersonalWalletRepository _walletRepo;
        private readonly ITrancheRepository _trancheRepo;
        private readonly ILedgerTransactionRepository _ledgerTxRepo;
        private readonly IPersonalInvestmentContributionRepository _contributionRepo;

        public PersonalInvestmentContributionService(
            IPersonalWalletRepository walletRepo,
            ITrancheRepository trancheRepo,
            ILedgerTransactionRepository ledgerTxRepo,
            IPersonalInvestmentContributionRepository contributionRepo)
        {
            _walletRepo = walletRepo;
            _trancheRepo = trancheRepo;
            _ledgerTxRepo = ledgerTxRepo;
            _contributionRepo = contributionRepo;
        }

        public async Task<long> ContributeAsync(
            long walletId,
            long trancheId,
            decimal amount,
            string? description,
            CancellationToken ct)
        {
            if (walletId <= 0) throw new DomainException("WalletId must be valid.");
            if (trancheId <= 0) throw new DomainException("TrancheId must be valid.");
            if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

            var wallet = await _walletRepo.GetByIdAsync(walletId, ct);
            if (wallet is null) throw new DomainException("Wallet not found.");

            var tranche = await _trancheRepo.GetByIdAsync(trancheId, ct);
            if (tranche is null) throw new DomainException("Tranche not found.");
            if (tranche.LiabilityAccountId <= 0) throw new DomainException("Tranche has no liability account.");

            var utcNow = DateTime.UtcNow;

            var narration = string.IsNullOrWhiteSpace(description)
                ? $"Personal investment contribution to {tranche.TrancheCode}"
                : $"Personal investment contribution to {tranche.TrancheCode}: {description.Trim()}";

            var ledgerTx = LedgerTransaction.CreateDraft(narration, ReferenceType.Tranche, tranche.Id);

            // Per requested rule:
            // 1. Debit Fund Liability Account
            // 2. Credit Personal Wallet Account
            ledgerTx.AddDebit(tranche.LiabilityAccountId, Money.NGN(amount));
            ledgerTx.AddCredit(wallet.LedgerAccountId, Money.NGN(amount));

            var record = PersonalInvestmentContribution.Create(
                walletId,
                trancheId,
                amount,
                utcNow,
                description,
                ledgerTx);

            await _ledgerTxRepo.AddAsync(ledgerTx, ct);
            await _contributionRepo.AddAsync(record, ct);

            // Single SaveChanges call for integrity (same EF DbContext under the hood).
            await _ledgerTxRepo.SaveChangesAsync(ct);

            return ledgerTx.Id;
        }
    }
}
