using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.Application.UseCases.Tranches;

public class FundTranche
{
    private readonly ITrancheRepository _trancheRepo;
    private readonly ILedgerTransactionRepository _txRepo;
    private readonly ILedgerAccountRepository _accountRepo;
    private readonly ILedgerSequenceGenerator _sequence;
    private readonly IAuditService _audit;

    public FundTranche(
        ITrancheRepository trancheRepo,
        ILedgerTransactionRepository txRepo,
        ILedgerAccountRepository accountRepo,
        ILedgerSequenceGenerator sequence,
        IAuditService audit)
    {
        _trancheRepo = trancheRepo;
        _txRepo = txRepo;
        _accountRepo = accountRepo;
        _sequence = sequence;
        _audit = audit;
    }

    public async Task<long> ExecuteAsync(
        long trancheId,
        decimal amount,
        long bankAccountId,
        long userId,
        CancellationToken ct)
    {
        if (trancheId <= 0) throw new DomainException("TrancheId must be valid.");
        if (bankAccountId <= 0) throw new DomainException("BankAccountId must be valid.");
        if (userId <= 0) throw new DomainException("ReceivedByUserId must be valid.");
        if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

        var tranche = await _trancheRepo.GetByIdAsync(trancheId, ct);

        if (tranche == null)
            throw new DomainException("Tranche not found.");

        if (tranche.LiabilityAccountId <= 0)
            throw new DomainException("Tranche has no liability account.");

        var bankAccount = await _accountRepo.GetByIdAsync(bankAccountId, ct);
        if (bankAccount is null)
            throw new DomainException("Bank account not found.");

        if (bankAccount.Type != AccountType.Asset)
            throw new DomainException("BankAccountId must be an Asset (cash/bank) account.");

        // Prevent overfunding: enforce that the net liability balance after this funding
        // does not exceed the tranche principal.
        var currentLiability = await _txRepo.GetPostedNetForAccountAsync(
            tranche.LiabilityAccountId,
            ReferenceType.Tranche,
            tranche.Id,
            ct);

        if (currentLiability + amount > tranche.Principal)
        {
            var remaining = tranche.Principal - currentLiability;
            if (remaining < 0) remaining = 0;
            throw new DomainException($"Funding exceeds tranche principal. Remaining fundable amount: {remaining:N2}.");
        }

        var utcNow = DateTime.UtcNow;
        var seq = await _sequence.NextAsync(utcNow, ct);

        var tx = LedgerTransaction.CreateDraft(
            $"Investor funding for {tranche.TrancheCode}",
            ReferenceType.Tranche,
            tranche.Id);

        tx.AddDebit(bankAccountId, Money.NGN(amount));
        tx.AddCredit(tranche.LiabilityAccountId, Money.NGN(amount));

        tx.Post(utcNow, userId, seq);

        await _txRepo.AddAsync(tx, ct);
        await _txRepo.SaveChangesAsync(ct);

        await _audit.RecordAsync(
            AuditCategory.InvestmentManagement,
            "Fund Tranche",
            $"Funded tranche {tranche.TrancheCode} with {amount:N2} NGN from bank account #{bankAccountId}",
            tx.Id,
            ct);

        return tx.Id;
    }
}