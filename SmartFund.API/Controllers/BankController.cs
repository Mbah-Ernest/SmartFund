using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Persistence.DbContext;

namespace SmartFund.API.Controllers;

/// <summary>Production bank account linking endpoints. Secret key lives in appsettings — never in browser.</summary>
[ApiController]
[Authorize]
[Route("api/bank")]
public sealed class BankController : SmartFundControllerBase
{
    private readonly BankLinkingService _linking;
    private readonly IConnectedBankAccountRepository _accounts;
        private readonly SmartFundDbContext _db;
        private readonly UserAuthService _auth;

        public BankController(
            BankLinkingService linking,
            IConnectedBankAccountRepository accounts,
            SmartFundDbContext db,
            UserAuthService auth)
    {
        _linking = linking;
        _accounts = accounts;
            _db = db;
            _auth = auth;
    }

    /// <summary>Returns a short-lived Mono Connect token for the browser widget.</summary>
    [HttpGet("connect-token")]
    public async Task<IActionResult> GetConnectToken(CancellationToken ct)
    {
        try
        {
            var token = await _linking.GenerateConnectTokenAsync(ct);
            return Ok(new { token });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = "Bank connection service is temporarily unavailable. Please check your Mono API key configuration.", detail = ex.Message });
        }
    }

    /// <summary>Exchanges auth code for a Mono account ID, saves account, triggers initial sync.</summary>
    [HttpPost("connect")]
    public async Task<IActionResult> Connect([FromBody] ConnectRequest body, CancellationToken ct)
    {
        try
        {
            var account = await _linking.ConnectAccountAsync(GetCurrentUserId(), body.AuthCode, ct);
            return Ok(new
            {
                account.Id,
                account.MonoAccountId,
                account.BankName,
                account.AccountNumber,
                account.AccountName,
                account.AccountType,
                account.Currency,
                BalanceNaira = account.LastKnownBalanceKobo / 100m,
                SyncStatus = account.SyncStatus.ToString(),
                account.LastSyncedAtUtc,
                account.LastSyncError,
                account.TotalTransactionsSynced,
                account.ConnectedAtUtc
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = "Failed to connect bank account. Please try again.", detail = ex.Message });
        }
    }

    /// <summary>Lists all connected accounts with sync status.</summary>
    [HttpGet("accounts")]
    public async Task<IActionResult> ListAccounts(CancellationToken ct)
    {
        var accounts = await _accounts.ListByUserAsync(GetCurrentUserId(), ct);
        return Ok(accounts.Select(a => new
        {
            a.Id,
            a.MonoAccountId,
            a.BankName,
            a.AccountNumber,
            a.AccountName,
            a.AccountType,
            a.Currency,
            BalanceNaira = a.LastKnownBalanceKobo / 100m,
            SyncStatus = a.SyncStatus.ToString(),
            a.LastSyncedAtUtc,
            a.LastSyncError,
            a.TotalTransactionsSynced,
            a.ConnectedAtUtc,
            a.PersonalWalletId
        }));
    }

    /// <summary>Gets a single connected account.</summary>
    [HttpGet("accounts/{id:long}")]
    public async Task<IActionResult> GetAccount(long id, CancellationToken ct)
    {
        var account = await _accounts.GetByIdForUserAsync(id, GetCurrentUserId(), ct);
        if (account is null) return NotFound();

        return Ok(new
        {
            account.Id,
            account.MonoAccountId,
            account.BankName,
            account.AccountNumber,
            account.AccountName,
            account.AccountType,
            account.Currency,
            BalanceNaira = account.LastKnownBalanceKobo / 100m,
            SyncStatus = account.SyncStatus.ToString(),
            account.LastSyncedAtUtc,
            account.LastSyncError,
            account.TotalTransactionsSynced,
            account.ConnectedAtUtc
        });
    }

    /// <summary>Disconnects a bank account (history preserved).</summary>
    [HttpDelete("accounts/{id:long}")]
        public async Task<IActionResult> Disconnect(long id, [FromBody] DisconnectBankAccountRequest body, CancellationToken ct)
    {
            if (body is null || string.IsNullOrWhiteSpace(body.Pin))
                return BadRequest(new { error = "PIN is required." });

            var userId = GetCurrentUserId();
            if (!await _auth.VerifyPasswordAsync(userId, body.Pin, ct))
                return BadRequest(new { error = "Invalid PIN." });

            var account = await _accounts.GetByIdForUserAsync(id, userId, ct);
            if (account is null)
                return NotFound();

            if (account.PersonalWalletId.HasValue)
            {
                var walletId = account.PersonalWalletId.Value;

                var txRows = await _db.PersonalTransactions
                    .Where(t => t.WalletId == walletId)
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
                        .Where(t => t.WalletId == walletId)
                        .ExecuteDeleteAsync(ct);

                    await _db.LedgerTransactions
                        .Where(t => ledgerIds.Contains(t.Id))
                        .ExecuteDeleteAsync(ct);
                }

                await _db.PersonalWallets
                    .Where(w => w.Id == walletId && w.UserId == userId)
                    .ExecuteDeleteAsync(ct);
            }

            // Delete all bank inbox items for this account regardless of status
            await _db.BankImportedTransactions
                .Where(b => b.ConnectedBankAccountId == id)
                .ExecuteDeleteAsync(ct);

            await _linking.DisconnectAsync(userId, id, ct);
        return NoContent();
    }

    /// <summary>Generates a reauth token for an account that needs reconnection.</summary>
    [HttpPut("accounts/{id:long}/reauth")]
    public async Task<IActionResult> GetReauthToken(long id, CancellationToken ct)
    {
        try
        {
            var token = await _linking.GenerateReauthTokenAsync(GetCurrentUserId(), id, ct);
            return Ok(new { token });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = "Bank connection service is temporarily unavailable.", detail = ex.Message });
        }
    }
}

public record ConnectRequest(string AuthCode);
public record DisconnectBankAccountRequest(string Pin);
