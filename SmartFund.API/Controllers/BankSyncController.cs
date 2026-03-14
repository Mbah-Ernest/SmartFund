using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Domain.Exceptions;

namespace SmartFund.API.Controllers;

[ApiController]
[Authorize]
[Route("api/bank")]
public sealed class BankSyncController : ControllerBase
{
    private const int MinSyncIntervalSeconds = 300; // 5 minutes between manual syncs

    private readonly BankSyncService _sync;
    private readonly IConnectedBankAccountRepository _accounts;

    public BankSyncController(BankSyncService sync, IConnectedBankAccountRepository accounts)
    {
        _sync = sync;
        _accounts = accounts;
    }

    /// <summary>Manually triggers a sync for a single connected account.</summary>
    [HttpPost("accounts/{id:long}/sync")]
    public async Task<IActionResult> SyncAccount(long id, CancellationToken ct)
    {
        var account = await _accounts.GetByIdAsync(id, ct);
        if (account is null) return NotFound();

        // Throttle: prevent hammering Mono API
        var elapsed = (DateTime.UtcNow - account.LastSyncedAtUtc).TotalSeconds;
        if (elapsed < MinSyncIntervalSeconds)
            return BadRequest(new { error = $"Please wait {(int)(MinSyncIntervalSeconds - elapsed)} more seconds before syncing again." });

        await _sync.SyncAccountAsync(account, ct);

        // Reload to get the latest balance and status after sync
        var updated = await _accounts.GetByIdAsync(id, ct) ?? account;

        return Ok(new
        {
            updated.Id,
            updated.MonoAccountId,
            updated.BankName,
            updated.AccountNumber,
            updated.AccountName,
            updated.Currency,
            BalanceNaira = updated.LastKnownBalanceKobo / 100m,
            SyncStatus = updated.SyncStatus.ToString(),
            updated.LastSyncedAtUtc,
            updated.LastSyncError,
            updated.TotalTransactionsSynced,
            updated.ConnectedAtUtc
        });
    }

    /// <summary>Returns the sync status for a connected account.</summary>
    [HttpGet("accounts/{id:long}/sync/status")]
    public async Task<IActionResult> GetSyncStatus(long id, CancellationToken ct)
    {
        var account = await _accounts.GetByIdAsync(id, ct);
        if (account is null) return NotFound();

        return Ok(new
        {
            account.Id,
            SyncStatus = account.SyncStatus.ToString(),
            account.LastSyncedAtUtc,
            account.LastSyncError,
            account.TotalTransactionsSynced
        });
    }

    /// <summary>Triggers a sync for all connected accounts (admin use).</summary>
    [HttpPost("sync-all")]
    public async Task<IActionResult> SyncAll(CancellationToken ct)
    {
        await _sync.SyncAllAsync(ct);
        return Ok(new { message = "Sync completed for all accounts." });
    }
}
