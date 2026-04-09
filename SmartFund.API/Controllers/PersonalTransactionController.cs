using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.PersonalFinance;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Enums;
using System.Collections.Generic;
using System.Linq;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-transactions")]
    public sealed class PersonalTransactionController : SmartFundControllerBase
    {
        private readonly IPersonalTransactionService _tx;
        private readonly IPersonalTransactionRepository _txRepo;
        private readonly IPersonalWalletRepository _walletRepo;
        private readonly IPersonalCategoryRepository _categoryRepo;

        private readonly IConnectedBankAccountRepository _bankAccountRepo;

        public PersonalTransactionController(
            IPersonalTransactionService tx,
            IPersonalTransactionRepository txRepo,
            IPersonalWalletRepository walletRepo,
            IPersonalCategoryRepository categoryRepo,
            IConnectedBankAccountRepository bankAccountRepo)
        {
            _tx = tx;
            _txRepo = txRepo;
            _walletRepo = walletRepo;
            _categoryRepo = categoryRepo;
            _bankAccountRepo = bankAccountRepo;
        }

        [HttpGet]
        public async Task<ActionResult<List<PersonalTransactionDto>>> List(
            [FromQuery] string? orderBy,
            [FromQuery] string? direction,
            [FromQuery] int? take,
            [FromQuery] long? walletId,
            CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var transactions = walletId.HasValue && walletId.Value > 0
                ? (await _txRepo.ListByUserAsync(userId, ct)).Where(t => t.WalletId == walletId.Value).ToList()
                : await _txRepo.ListByUserAsync(userId, ct);
            var wallets = await _walletRepo.ListAsync(ct);
            var categories = await _categoryRepo.ListAsync(ct);
            var bankAccounts = await _bankAccountRepo.ListAsync(ct);

            var desc = !string.Equals(direction, "asc", StringComparison.OrdinalIgnoreCase);

            IEnumerable<SmartFund.Domain.PersonalFinance.Entities.PersonalTransaction> sorted = orderBy?.Trim().ToLowerInvariant() switch
            {
                "date" or "transactiondate" => desc
                    ? transactions.OrderByDescending(t => t.Date).ThenByDescending(t => t.Id)
                    : transactions.OrderBy(t => t.Date).ThenBy(t => t.Id),

                "amount" => desc
                    ? transactions.OrderByDescending(t => t.Amount).ThenByDescending(t => t.Id)
                    : transactions.OrderBy(t => t.Amount).ThenBy(t => t.Id),

                // Default to input/record order (best-effort). Id is an auto-increment key.
                "inputtime" or "input" or "created" or "id" or null or "" => desc
                    ? transactions.OrderByDescending(t => t.Id)
                    : transactions.OrderBy(t => t.Id),

                _ => desc
                    ? transactions.OrderByDescending(t => t.Id)
                    : transactions.OrderBy(t => t.Id)
            };

            if (take is > 0)
                sorted = sorted.Take(take.Value);

            var walletMap = wallets.ToDictionary(w => w.Id, w => w.Name);
            var categoryMap = categories.ToDictionary(c => c.Id, c => c.Name);
            var bankAccountMap = bankAccounts.ToDictionary(a => a.Id, a =>
            {
                var last4 = a.AccountNumber.Length >= 4 ? a.AccountNumber[^4..] : a.AccountNumber;
                return $"{a.BankName} \u2022\u2022\u2022\u2022{last4}";
            });

            static string TypeName(PersonalTransactionType t) => t switch
            {
                PersonalTransactionType.Income => "Income",
                PersonalTransactionType.Expense => "Expense",
                PersonalTransactionType.Transfer => "Transfer",
                PersonalTransactionType.Adjustment => "Adjustment",
                _ => t.ToString()
            };

            var dtos = sorted.Select(t => new PersonalTransactionDto
            {
                Id = t.Id,
                WalletId = t.WalletId,
                Amount = t.Amount,
                Wallet = t.WalletId > 0 && walletMap.TryGetValue(t.WalletId, out var wn) ? wn : $"Wallet #{t.WalletId}",
                Category = t.CategoryId.HasValue && categoryMap.TryGetValue(t.CategoryId.Value, out var cn) ? cn : "—",
                Type = TypeName(t.TransactionType),
                Source = t.Source.ToString(),
                Date = t.Date,
                Description = t.Description,
                SourceConnectedBankAccountId = t.SourceConnectedBankAccountId,
                SourceBankImportedTransactionId = t.SourceBankImportedTransactionId,
                SourceBankLabel = t.SourceConnectedBankAccountId.HasValue &&
                    bankAccountMap.TryGetValue(t.SourceConnectedBankAccountId.Value, out var bl) ? bl : null
            }).ToList();

            return Ok(dtos);
        }

        [HttpPost("income")]
        public async Task<ActionResult<RecordTransactionResponse>> RecordIncome(
            [FromBody] RecordIncomeRequest request,
            CancellationToken ct)
        {
            var ledgerTxId = await _tx.RecordIncomeAsync(
                GetCurrentUserId(),
                request.WalletId,
                request.CategoryId,
                request.Amount,
                request.Description,
                request.Date,
                ct);

            return Ok(new RecordTransactionResponse { LedgerTransactionId = ledgerTxId });
        }

        [HttpPost("expense")]
        public async Task<ActionResult<RecordTransactionResponse>> RecordExpense(
            [FromBody] RecordExpenseRequest request,
            CancellationToken ct)
        {
            var ledgerTxId = await _tx.RecordExpenseAsync(
                GetCurrentUserId(),
                request.WalletId,
                request.CategoryId,
                request.Amount,
                request.Description,
                request.Date,
                ct);

            return Ok(new RecordTransactionResponse { LedgerTransactionId = ledgerTxId });
        }

        [HttpPost("transfer")]
        public async Task<ActionResult<RecordTransactionResponse>> RecordTransfer(
            [FromBody] RecordTransferRequest request,
            CancellationToken ct)
        {
            var ledgerTxId = await _tx.RecordTransferAsync(
                GetCurrentUserId(),
                request.SourceWalletId,
                request.DestinationWalletId,
                request.Amount,
                request.Description,
                request.Date,
                ct);

            return Ok(new RecordTransactionResponse { LedgerTransactionId = ledgerTxId });
        }

        [HttpPatch("{id:long}/description")]
        public async Task<IActionResult> UpdateDescription(
            long id,
            [FromBody] UpdateDescriptionRequest request,
            CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var tx = await _txRepo.GetByIdAsync(id, ct);
            if (tx is null || tx.UserId != userId)
                return NotFound();

            tx.UpdateDescription(request.Description);
            await _txRepo.SaveChangesAsync(ct);

            return Ok(new { id = tx.Id, description = tx.Description });
        }
    }
}
