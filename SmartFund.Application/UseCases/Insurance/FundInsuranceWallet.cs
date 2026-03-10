using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.Application.UseCases.Insurance;

public sealed class FundInsuranceWallet
{
    private readonly IInsuranceWalletRepository _walletRepo;
    private readonly ILedgerAccountRepository _accountRepo;
    private readonly ILedgerTransactionRepository _txRepo;
    private readonly ILedgerSequenceGenerator _sequence;
    private readonly IDealRepository _dealRepo;

    public FundInsuranceWallet(
        IInsuranceWalletRepository walletRepo,
        ILedgerAccountRepository accountRepo,
        ILedgerTransactionRepository txRepo,
        ILedgerSequenceGenerator sequence,
        IDealRepository dealRepo)
    {
        _walletRepo = walletRepo;
        _accountRepo = accountRepo;
        _txRepo = txRepo;
        _sequence = sequence;
        _dealRepo = dealRepo;
    }

    public async Task<long> ExecuteAsync(
        InsuranceWalletType walletType,
        long? dealId,
        decimal amount,
        long bankAccountId,
        long receivedByUserId,
        CancellationToken ct)
    {
        if (amount <= 0) throw new DomainException("Amount must be greater than zero.");
        if (bankAccountId <= 0) throw new DomainException("BankAccountId must be valid.");
        if (receivedByUserId <= 0) throw new DomainException("ReceivedByUserId must be valid.");

        InsuranceWallet? wallet;

        if (walletType == InsuranceWalletType.Global)
        {
            wallet = await _walletRepo.GetGlobalAsync(ct);
            if (wallet is null)
            {
                wallet = InsuranceWallet.CreateGlobal();
                await _walletRepo.AddAsync(wallet, ct);
                await _walletRepo.SaveChangesAsync(ct);

                var reserveAccount = LedgerAccount.Create(
                    "Insurance Reserve - Global",
                    AccountType.Liability,
                    ReferenceType.InsuranceWallet,
                    wallet.Id);

                await _accountRepo.AddAsync(reserveAccount, ct);
                await _accountRepo.SaveChangesAsync(ct);

                wallet.SetReserveAccount(reserveAccount.Id);
                await _walletRepo.SaveChangesAsync(ct);
            }
        }
        else
        {
            if (!dealId.HasValue || dealId.Value <= 0)
                throw new DomainException("DealId is required for a Deal insurance wallet.");

            var deal = await _dealRepo.GetByIdAsync(dealId.Value, ct);
            if (deal is null)
                throw new DomainException("Deal not found.");

            wallet = await _walletRepo.GetByDealIdAsync(dealId.Value, ct);
            if (wallet is null)
            {
                wallet = InsuranceWallet.CreateForDeal(dealId.Value);
                await _walletRepo.AddAsync(wallet, ct);
                await _walletRepo.SaveChangesAsync(ct);

                var reserveAccount = LedgerAccount.Create(
                    $"Insurance Reserve - {deal.DealCode}",
                    AccountType.Liability,
                    ReferenceType.InsuranceWallet,
                    wallet.Id);

                await _accountRepo.AddAsync(reserveAccount, ct);
                await _accountRepo.SaveChangesAsync(ct);

                wallet.SetReserveAccount(reserveAccount.Id);
                await _walletRepo.SaveChangesAsync(ct);
            }
        }

        if (!wallet.ReserveAccountId.HasValue || wallet.ReserveAccountId.Value <= 0)
            throw new DomainException("Insurance wallet has no reserve ledger account.");

        var utcNow = DateTime.UtcNow;
        var seq = await _sequence.NextAsync(utcNow, ct);

        var tx = LedgerTransaction.CreateDraft(
            $"Insurance funding ({wallet.Type})",
            ReferenceType.InsuranceWallet,
            wallet.Id);

        // Debit Bank, Credit Insurance Reserve
        tx.AddDebit(bankAccountId, Money.NGN(amount));
        tx.AddCredit(wallet.ReserveAccountId.Value, Money.NGN(amount));

        tx.Post(utcNow, receivedByUserId, seq);

        wallet.Fund(amount);

        await _txRepo.AddAsync(tx, ct);
        await _txRepo.SaveChangesAsync(ct);

        await _walletRepo.SaveChangesAsync(ct);

        return tx.Id;
    }
}
