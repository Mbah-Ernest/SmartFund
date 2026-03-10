using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.Application.UseCases.Tranches;

public sealed class PayTrancheInvestor
{
    private readonly ITrancheRepository _trancheRepo;
    private readonly ILedgerTransactionRepository _txRepo;
    private readonly ILedgerAccountRepository _accountRepo;
    private readonly ILedgerSequenceGenerator _sequence;

    public PayTrancheInvestor(
        ITrancheRepository trancheRepo,
        ILedgerTransactionRepository txRepo,
        ILedgerAccountRepository accountRepo,
        ILedgerSequenceGenerator sequence)
    {
        _trancheRepo = trancheRepo;
        _txRepo = txRepo;
        _accountRepo = accountRepo;
        _sequence = sequence;
    }

    public async Task<long> ExecuteAsync(
        long trancheId,
        decimal amount,
        long bankAccountId,
        long paidByUserId,
        CancellationToken ct)
    {
        if (trancheId <= 0) throw new DomainException("TrancheId must be valid.");
        if (bankAccountId <= 0) throw new DomainException("BankAccountId must be valid.");
        if (paidByUserId <= 0) throw new DomainException("PaidByUserId must be valid.");
        if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

        var tranche = await _trancheRepo.GetByIdAsync(trancheId, ct);

        if (tranche is null)
            throw new DomainException("Tranche not found.");

        if (tranche.LiabilityAccountId <= 0)
            throw new DomainException("Tranche has no liability account.");

        var bankAccount = await _accountRepo.GetByIdAsync(bankAccountId, ct);
        if (bankAccount is null)
            throw new DomainException("Bank account not found.");

        if (bankAccount.Type != AccountType.Asset)
            throw new DomainException("BankAccountId must be an Asset (cash/bank) account.");

        var utcToday = DateTime.UtcNow.Date;
        var isEarly = utcToday < tranche.MaturityDate.Date;

        if (isEarly)
        {
            if (tranche.EarlyWithdrawalPolicy == EarlyWithdrawalPolicy.NotAllowed)
                throw new DomainException("Early withdrawal not allowed for this tranche.");

            // Cap early payout based on the configured policy.
            // (We don't currently accrue ROI into the liability account, so this is a guardrail.)
            var maxAllowed = tranche.Principal;

            if (tranche.EarlyWithdrawalPolicy == EarlyWithdrawalPolicy.Allowed_ProRataRoi)
            {
                // Allow paying out principal + pro-rata ROI up to 'today' using the same ROI settings.
                var engine = SmartFund.Domain.Services.RoiCalculationEngine.Default();
                var result = engine.Calculate(tranche.Principal, tranche.RoiRate, tranche.StartDate, utcToday, tranche.RoiType);
                maxAllowed = result.TotalPayable;
            }

            if (amount > maxAllowed)
                throw new DomainException("Payout amount exceeds allowed amount for early withdrawal policy.");
        }
        else
        {
            if (tranche.PayoutType == PayoutType.AtMaturity && utcToday < tranche.MaturityDate.Date)
                throw new DomainException("Cannot payout before maturity for AtMaturity tranches.");
        }

        // Ensure there is enough posted liability balance to pay out.
        var currentLiability = await _txRepo.GetPostedNetForAccountAsync(
            tranche.LiabilityAccountId,
            ReferenceType.Tranche,
            tranche.Id,
            ct);

        if (amount > currentLiability)
            throw new DomainException("Payout amount exceeds funded balance for this tranche.");

        var utcNow = DateTime.UtcNow;
        var seq = await _sequence.NextAsync(utcNow, ct);

        var tx = LedgerTransaction.CreateDraft(
            $"Investor payout for {tranche.TrancheCode}",
            ReferenceType.Tranche,
            tranche.Id);

        // Payout reduces liability (debit) and pays out of a bank/cash account (credit)
        tx.AddDebit(tranche.LiabilityAccountId, Money.NGN(amount));
        tx.AddCredit(bankAccountId, Money.NGN(amount));

        tx.Post(utcNow, paidByUserId, seq);

        await _txRepo.AddAsync(tx, ct);
        await _txRepo.SaveChangesAsync(ct);

        return tx.Id;
    }
}
