using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.API.Controllers;

/// <summary>Production bank account linking endpoints. Secret key lives in appsettings — never in browser.</summary>
[ApiController]
[Authorize]
[Route("api/bank")]
public sealed class BankController : ControllerBase
{
    private readonly BankLinkingService _linking;
    private readonly IConnectedBankAccountRepository _accounts;

    public BankController(BankLinkingService linking, IConnectedBankAccountRepository accounts)
    {
        _linking = linking;
        _accounts = accounts;
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
            var account = await _linking.ConnectAccountAsync(body.AuthCode, ct);
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
        var accounts = await _accounts.ListAsync(ct);
        return Ok(accounts.Select(a => new
        {
            a.Id,
            a.MonoAccountId,
            a.BankName,
            a.AccountNumber,
            a.AccountName,
            a.Currency,
            BalanceNaira = a.LastKnownBalanceKobo / 100m,
            SyncStatus = a.SyncStatus.ToString(),
            a.LastSyncedAtUtc,
            a.LastSyncError,
            a.TotalTransactionsSynced,
            a.ConnectedAtUtc
        }));
    }

    /// <summary>Gets a single connected account.</summary>
    [HttpGet("accounts/{id:long}")]
    public async Task<IActionResult> GetAccount(long id, CancellationToken ct)
    {
        var account = await _accounts.GetByIdAsync(id, ct);
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
    public async Task<IActionResult> Disconnect(long id, CancellationToken ct)
    {
        await _linking.DisconnectAsync(id, ct);
        return NoContent();
    }

    /// <summary>Generates a reauth token for an account that needs reconnection.</summary>
    [HttpPut("accounts/{id:long}/reauth")]
    public async Task<IActionResult> GetReauthToken(long id, CancellationToken ct)
    {
        try
        {
            var token = await _linking.GenerateReauthTokenAsync(id, ct);
            return Ok(new { token });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { error = "Bank connection service is temporarily unavailable.", detail = ex.Message });
        }
    }
}

public record ConnectRequest(string AuthCode);
