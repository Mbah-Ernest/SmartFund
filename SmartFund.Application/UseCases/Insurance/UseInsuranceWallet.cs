using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.Application.UseCases.Insurance;

public sealed class UseInsuranceWallet
{
    private readonly IInsuranceWalletRepository _walletRepo;
    private readonly ITrancheRepository _trancheRepo;
    private readonly ILedgerTransactionRepository _txRepo;
    private readonly ILedgerSequenceGenerator _sequence;

    public UseInsuranceWallet(
        IInsuranceWalletRepository walletRepo,
        ITrancheRepository trancheRepo,
        ILedgerTransactionRepository txRepo,
        ILedgerSequenceGenerator sequence)
    {
        _walletRepo = walletRepo;
        _trancheRepo = trancheRepo;
        _txRepo = txRepo;
        _sequence = sequence;
    }

    public async Task<long> ExecuteAsync(
        long trancheId,
        decimal amount,
        long usedByUserId,
        CancellationToken ct)
    {
        if (trancheId <= 0) throw new DomainException("TrancheId must be valid.");
        if (usedByUserId <= 0) throw new DomainException("UsedByUserId must be valid.");
        if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

        var tranche = await _trancheRepo.GetByIdAsync(trancheId, ct);
        if (tranche is null)
            throw new DomainException("Tranche not found.");

        if (tranche.LiabilityAccountId <= 0)
            throw new DomainException("Tranche has no liability account.");

        InsuranceWallet? wallet = null;

        if (tranche.DealId.HasValue)
            wallet = await _walletRepo.GetByDealIdAsync(tranche.DealId.Value, ct);

        wallet ??= await _walletRepo.GetGlobalAsync(ct);

        if (wallet is null)
            throw new DomainException("Insurance wallet not found.");

        if (!wallet.ReserveAccountId.HasValue || wallet.ReserveAccountId.Value <= 0)
            throw new DomainException("Insurance wallet has no reserve ledger account.");

        wallet.Use(amount);

        var utcNow = DateTime.UtcNow;
        var seq = await _sequence.NextAsync(utcNow, ct);

        var tx = LedgerTransaction.CreateDraft(
            $"Insurance usage for {tranche.TrancheCode}",
            ReferenceType.Tranche,
            tranche.Id);

        // Debit Insurance Reserve, Credit Tranche Liability
        tx.AddDebit(wallet.ReserveAccountId.Value, Money.NGN(amount));
        tx.AddCredit(tranche.LiabilityAccountId, Money.NGN(amount));

        tx.Post(utcNow, usedByUserId, seq);

        await _txRepo.AddAsync(tx, ct);
        await _txRepo.SaveChangesAsync(ct);

        await _walletRepo.SaveChangesAsync(ct);

        return tx.Id;
    }
}
