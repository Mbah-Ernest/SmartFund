using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFund.API.Contracts.PersonalFinance;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Services;
using SmartFund.Application.Interfaces;
using SmartFund.Application.UseCases.PersonalFinance;
using SmartFund.Persistence.DbContext;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-wallets")]
    public sealed class PersonalWalletController : SmartFundControllerBase
    {
        private readonly IPersonalWalletService _wallets;
        private readonly SmartFundDbContext _db;
        private readonly UserAuthService _auth;
        private readonly ReconcileWallet _reconcile;
        private readonly BulkReconcileWalletsUseCase _bulkReconcile;

        public PersonalWalletController(IPersonalWalletService wallets, SmartFundDbContext db, UserAuthService auth, ReconcileWallet reconcile, BulkReconcileWalletsUseCase bulkReconcile)
        {
            _wallets = wallets;
            _db = db;
            _auth = auth;
            _reconcile = reconcile;
            _bulkReconcile = bulkReconcile;
        }

        [HttpPost]
        public async Task<ActionResult<PersonalWalletDto>> Create(
            [FromBody] CreatePersonalWalletRequest request,
            CancellationToken ct)
        {
            var wallet = await _wallets.CreateWalletAsync(GetCurrentUserId(), request.Name, request.Currency, ct);

            var dto = new PersonalWalletDto
            {
                Id = wallet.Id,
                Name = wallet.Name,
                Currency = wallet.Currency,
                LedgerAccountId = wallet.LedgerAccountId,
                CreatedAt = wallet.CreatedAt,
                OpeningBalance = wallet.OpeningBalance,
                OpeningBalanceDate = wallet.OpeningBalanceDate
            };

            return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<PersonalWalletDto>> GetById(long id, CancellationToken ct)
        {
            var wallet = await _wallets.GetWalletAsync(id, ct);

            if (wallet is null)
                return NotFound();

            return Ok(new PersonalWalletDto
            {
                Id = wallet.Id,
                Name = wallet.Name,
                Currency = wallet.Currency,
                LedgerAccountId = wallet.LedgerAccountId,
                CreatedAt = wallet.CreatedAt,
                OpeningBalance = wallet.OpeningBalance,
                OpeningBalanceDate = wallet.OpeningBalanceDate
            });
        }

        [HttpGet]
        public async Task<ActionResult<PersonalWalletDto[]>> List(CancellationToken ct)
        {
            var wallets = await _wallets.GetAllWalletsByUserAsync(GetCurrentUserId(), ct);

            var dtos = wallets.Select(w => new PersonalWalletDto
            {
                Id = w.Id,
                Name = w.Name,
                Currency = w.Currency,
                LedgerAccountId = w.LedgerAccountId,
                CreatedAt = w.CreatedAt,
                OpeningBalance = w.OpeningBalance,
                OpeningBalanceDate = w.OpeningBalanceDate
            }).ToArray();

            return Ok(dtos);
        }

        [HttpGet("{id:long}/balance")]
        public async Task<ActionResult<WalletBalanceDto>> GetBalance(long id, CancellationToken ct)
        {
            var balance = await _wallets.GetWalletBalanceAsync(id, ct);
            return Ok(new WalletBalanceDto { WalletId = id, Balance = balance });
        }

        [HttpPut("{id:long}/opening-balance")]
        public async Task<IActionResult> SetOpeningBalance(long id, [FromBody] SetOpeningBalanceRequest body, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            await _wallets.SetOpeningBalanceAsync(id, userId, body.Amount, body.Date, ct);

            var wallet = await _wallets.GetWalletForUserAsync(id, userId, ct);
            if (wallet is null)
                return NotFound();

            return Ok(new PersonalWalletDto
            {
                Id = wallet.Id,
                Name = wallet.Name,
                Currency = wallet.Currency,
                LedgerAccountId = wallet.LedgerAccountId,
                CreatedAt = wallet.CreatedAt,
                OpeningBalance = wallet.OpeningBalance,
                OpeningBalanceDate = wallet.OpeningBalanceDate
            });
        }

        [HttpPost("{id:long}/reconcile")]
        public async Task<IActionResult> Reconcile(long id, [FromBody] ReconcileWalletRequest body, CancellationToken ct)
        {
            var (diff, newBalance) = await _reconcile.ExecuteAsync(
                GetCurrentUserId(), id, body.ActualBalance, body.Date, body.Note, ct);

            return Ok(new { diff, newBalance });
        }

        [HttpPost("bulk-reconcile")]
        public async Task<IActionResult> BulkReconcile([FromBody] List<BulkReconcileEntryRequest> body, CancellationToken ct)
        {
            var entries = body.Select(e => new BulkReconcileWalletsUseCase.Entry(e.WalletId, e.ActualBalance)).ToList();
            var result = await _bulkReconcile.ExecuteAsync(GetCurrentUserId(), entries, DateTime.UtcNow, ct);

            return Ok(new
            {
                adjusted = result.Adjusted.Select(a => new
                {
                    walletId = a.WalletId,
                    walletName = a.WalletName,
                    drift = a.Drift,
                    newBalance = a.NewBalance,
                }),
                skipped = result.Skipped,
            });
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, [FromBody] DeleteWalletRequest body, CancellationToken ct)
        {
            if (body is null || string.IsNullOrWhiteSpace(body.Pin))
                return BadRequest(new { error = "PIN is required." });

            var userId = GetCurrentUserId();
            if (!await _auth.VerifyPasswordAsync(userId, body.Pin, ct))
                return BadRequest(new { error = "Invalid PIN." });

            var wallet = await _wallets.GetWalletForUserAsync(id, userId, ct);
            if (wallet is null)
                return NotFound(new { error = "Wallet not found." });

            var txRows = await _db.PersonalTransactions
                .Where(t => t.WalletId == id)
                .Select(t => new { t.Id, t.LedgerTransactionId })
                .ToListAsync(ct);

            var txIds = txRows.Select(x => x.Id).ToList();
            var ledgerIds = txRows.Select(x => x.LedgerTransactionId).Distinct().ToList();

            if (txIds.Count > 0)
            {
                await _db.BankImportedTransactions
                    .Where(b => b.LinkedPersonalTransactionId != null && txIds.Contains(b.LinkedPersonalTransactionId.Value))
                    .ExecuteUpdateAsync(s => s.SetProperty(b => b.LinkedPersonalTransactionId, (long?)null), ct);

                await _db.PersonalTransactions
                    .Where(t => t.WalletId == id)
                    .ExecuteDeleteAsync(ct);

                await _db.LedgerTransactions
                    .Where(t => ledgerIds.Contains(t.Id))
                    .ExecuteDeleteAsync(ct);
            }

            await _db.PersonalWallets
                .Where(w => w.Id == id && w.UserId == userId)
                .ExecuteDeleteAsync(ct);

            return NoContent();
        }
    }

    public record DeleteWalletRequest(string Pin);
    public record SetOpeningBalanceRequest(decimal Amount, DateTime Date);
    public record ReconcileWalletRequest(decimal ActualBalance, DateTime Date, string? Note);
    public record BulkReconcileEntryRequest(long WalletId, decimal ActualBalance);
}
