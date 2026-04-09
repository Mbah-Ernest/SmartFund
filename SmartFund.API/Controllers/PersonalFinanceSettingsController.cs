using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Persistence.DbContext;

namespace SmartFund.API.Controllers;

[ApiController]
[Authorize]
[Route("api/personal-finance")]
public sealed class PersonalFinanceSettingsController : SmartFundControllerBase
{
    private readonly IPersonalFinanceSettingsRepository _settingsRepo;
    private readonly IConnectedBankAccountRepository _bankAccountRepo;
    private readonly SmartFundDbContext _db;

    public PersonalFinanceSettingsController(
        IPersonalFinanceSettingsRepository settingsRepo,
        IConnectedBankAccountRepository bankAccountRepo,
        SmartFundDbContext db)
    {
        _settingsRepo = settingsRepo;
        _bankAccountRepo = bankAccountRepo;
        _db = db;
    }

    /// <summary>Returns the current personal finance settings (or defaults if not yet configured).</summary>
    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
    {
        var settings = await _settingsRepo.GetByUserAsync(GetCurrentUserId(), ct);
        if (settings is null)
        {
            return Ok(new
            {
                launchDateUtc = DateTime.UtcNow.AddMonths(-3).Date,
                createdAtUtc = (DateTime?)null,
                updatedAtUtc = (DateTime?)null,
                lastResetAtUtc = (DateTime?)null,
                isConfigured = false
            });
        }

        return Ok(new
        {
            launchDateUtc = settings.LaunchDateUtc,
            createdAtUtc = (DateTime?)settings.CreatedAtUtc,
            updatedAtUtc = (DateTime?)settings.UpdatedAtUtc,
            lastResetAtUtc = settings.LastResetAtUtc,
            isConfigured = true
        });
    }

    /// <summary>Creates or updates the personal finance settings (launch date).</summary>
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest body, CancellationToken ct)
    {
        if (!DateTime.TryParse(body.LaunchDate, out var launchDate))
            return BadRequest(new { error = "Invalid launchDate. Expected ISO 8601 date string." });

        var userId = GetCurrentUserId();
        var settings = await _settingsRepo.GetByUserAsync(userId, ct);
        if (settings is null)
        {
            settings = PersonalFinanceSettings.Create(userId, launchDate, DateTime.UtcNow);
            await _settingsRepo.AddAsync(settings, ct);
        }
        else
        {
            settings.UpdateLaunchDate(launchDate, DateTime.UtcNow);
        }

        await _settingsRepo.SaveChangesAsync(ct);

        return Ok(new
        {
            launchDateUtc = settings.LaunchDateUtc,
            updatedAtUtc = settings.UpdatedAtUtc
        });
    }

    /// <summary>
    /// Resets personal finance data: deletes all bank imports and the personal transactions
    /// created from them, then resets sync counters so a fresh backfill can run.
    /// Requires typing "RESET" to confirm.
    /// </summary>
    [HttpPost("reset")]
    public async Task<IActionResult> Reset([FromBody] ResetRequest body, CancellationToken ct)
    {
        if (body.Confirmation != "RESET")
            return BadRequest(new { error = "Type RESET in the confirmation field to proceed." });

        // Step 1: Find all PersonalTransactions derived from bank imports
        var bankDerived = await _db.PersonalTransactions
            .Where(t => t.SourceBankImportedTransactionId != null)
            .Select(t => new { t.Id, t.LedgerTransactionId })
            .ToListAsync(ct);

        var personalTxIds = bankDerived.Select(t => t.Id).ToList();
        var ledgerTxIds = bankDerived.Select(t => t.LedgerTransactionId).ToList();

        // Step 2: Break the FK from BankImportedTransactions → PersonalTransactions
        //         (LinkedPersonalTransactionId is nullable, so we can null it before deleting)
        if (personalTxIds.Count > 0)
        {
            await _db.BankImportedTransactions
                .Where(b => b.LinkedPersonalTransactionId != null
                            && personalTxIds.Contains(b.LinkedPersonalTransactionId!.Value))
                .ExecuteUpdateAsync(s =>
                    s.SetProperty(b => b.LinkedPersonalTransactionId, (long?)null), ct);

            // Step 3: Delete bank-derived PersonalTransactions
            await _db.PersonalTransactions
                .Where(t => personalTxIds.Contains(t.Id))
                .ExecuteDeleteAsync(ct);

            // Step 4: Delete the LedgerTransactions (entries cascade-deleted via OnDelete(Cascade))
            await _db.LedgerTransactions
                .Where(t => ledgerTxIds.Contains(t.Id))
                .ExecuteDeleteAsync(ct);
        }

        // Step 5: Delete all BankImportedTransactions
        await _db.BankImportedTransactions.ExecuteDeleteAsync(ct);

        // Step 6: Reset sync counters on all connected accounts
        await _db.ConnectedBankAccounts
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.TotalTransactionsSynced, 0)
                .SetProperty(a => a.LastSyncError, (string?)null)
                .SetProperty(a => a.SyncStatus, BankAccountSyncStatus.Active), ct);

        // Step 7: Record reset timestamp in settings
        var settings = await _settingsRepo.GetByUserAsync(GetCurrentUserId(), ct);
        if (settings is not null)
        {
            settings.RecordReset(DateTime.UtcNow);
            await _settingsRepo.SaveChangesAsync(ct);
        }

        return Ok(new
        {
            deletedPersonalTransactions = personalTxIds.Count,
            deletedLedgerTransactions = ledgerTxIds.Count,
            message = "Personal finance data reset. Re-sync will use the configured launch date."
        });
    }
}

public record UpdateSettingsRequest(string LaunchDate);
public record ResetRequest(string Confirmation);
