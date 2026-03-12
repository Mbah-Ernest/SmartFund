using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.PersonalFinance;
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
    public sealed class PersonalTransactionController : ControllerBase
    {
        private readonly IPersonalTransactionService _tx;
        private readonly IPersonalInvestmentContributionService _contributions;
        private readonly IPersonalTransactionRepository _txRepo;
        private readonly IPersonalWalletRepository _walletRepo;
        private readonly IPersonalCategoryRepository _categoryRepo;

        public PersonalTransactionController(
            IPersonalTransactionService tx,
            IPersonalInvestmentContributionService contributions,
            IPersonalTransactionRepository txRepo,
            IPersonalWalletRepository walletRepo,
            IPersonalCategoryRepository categoryRepo)
        {
            _tx = tx;
            _contributions = contributions;
            _txRepo = txRepo;
            _walletRepo = walletRepo;
            _categoryRepo = categoryRepo;
        }

        [HttpGet]
        public async Task<ActionResult<List<PersonalTransactionDto>>> List(
            [FromQuery] string? orderBy,
            [FromQuery] string? direction,
            [FromQuery] int? take,
            CancellationToken ct)
        {
            var transactions = await _txRepo.ListAllAsync(ct);
            var wallets = await _walletRepo.ListAsync(ct);
            var categories = await _categoryRepo.ListAsync(ct);

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

            static string TypeName(PersonalTransactionType t) => t switch
            {
                PersonalTransactionType.Income => "Income",
                PersonalTransactionType.Expense => "Expense",
                PersonalTransactionType.Transfer => "Transfer",
                PersonalTransactionType.InvestmentContribution => "Investment",
                _ => t.ToString()
            };

            var dtos = sorted.Select(t => new PersonalTransactionDto
            {
                Id = t.Id,
                Amount = t.Amount,
                Wallet = t.WalletId > 0 && walletMap.TryGetValue(t.WalletId, out var wn) ? wn : $"Wallet #{t.WalletId}",
                Category = t.CategoryId.HasValue && categoryMap.TryGetValue(t.CategoryId.Value, out var cn) ? cn : "—",
                Type = TypeName(t.TransactionType),
                Date = t.Date,
                Description = t.Description
            }).ToList();

            return Ok(dtos);
        }

        [HttpPost("income")]
        public async Task<ActionResult<RecordTransactionResponse>> RecordIncome(
            [FromBody] RecordIncomeRequest request,
            CancellationToken ct)
        {
            var ledgerTxId = await _tx.RecordIncomeAsync(
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
                request.SourceWalletId,
                request.DestinationWalletId,
                request.Amount,
                request.Description,
                request.Date,
                ct);

            return Ok(new RecordTransactionResponse { LedgerTransactionId = ledgerTxId });
        }

        [HttpPost("investment-contribution")]
        public async Task<ActionResult<RecordTransactionResponse>> RecordInvestmentContribution(
            [FromBody] RecordInvestmentContributionRequest request,
            CancellationToken ct)
        {
            var ledgerTxId = await _contributions.ContributeAsync(
                request.WalletId,
                request.TrancheId,
                request.Amount,
                request.Description,
                ct);

            return Ok(new RecordTransactionResponse { LedgerTransactionId = ledgerTxId });
        }
    }
}
