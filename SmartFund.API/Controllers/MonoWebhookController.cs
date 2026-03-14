using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Infrastructure.BankSync; // MonoOptions configuration type

namespace SmartFund.API.Controllers;

/// <summary>
/// Receives webhook events from Mono and triggers the appropriate actions.
/// Validates the HMAC-SHA512 signature on every request.
/// </summary>
[ApiController]
[Route("api/webhooks/mono")]
public sealed class MonoWebhookController : ControllerBase
{
    private readonly IConnectedBankAccountRepository _accounts;
    private readonly BankSyncService _sync;
    private readonly MonoOptions _options;
    private readonly ILogger<MonoWebhookController> _logger;

    public MonoWebhookController(
        IConnectedBankAccountRepository accounts,
        BankSyncService sync,
        IOptions<MonoOptions> options,
        ILogger<MonoWebhookController> logger)
    {
        _accounts = accounts;
        _sync = sync;
        _options = options.Value;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Receive(CancellationToken ct)
    {
        // Read raw body for HMAC verification
        Request.EnableBuffering();
        var rawBody = await new StreamReader(Request.Body).ReadToEndAsync(ct);
        Request.Body.Position = 0;

        // Validate signature
        if (!Request.Headers.TryGetValue("mono-webhook-secret", out var sigHeader))
        {
            _logger.LogWarning("Mono webhook received without signature header.");
            return Unauthorized(new { error = "Missing mono-webhook-secret header." });
        }

        if (!IsValidSignature(rawBody, sigHeader.ToString()))
        {
            _logger.LogWarning("Mono webhook signature validation failed.");
            return Unauthorized(new { error = "Invalid webhook signature." });
        }

        var node = JsonNode.Parse(rawBody);
        var eventType = node?["event"]?.GetValue<string>() ?? string.Empty;
        var monoAccountId = node?["data"]?["account"]?["id"]?.GetValue<string>()
            ?? node?["data"]?["id"]?.GetValue<string>();

        _logger.LogInformation("Mono webhook received: {EventType} for account {MonoAccountId}", eventType, monoAccountId);

        switch (eventType)
        {
            case "mono.events.account_updated":
            case "mono.events.sync_successful":
                if (!string.IsNullOrWhiteSpace(monoAccountId))
                    await TriggerSyncAsync(monoAccountId, ct);
                break;

            case "mono.events.reauthorisation":
                if (!string.IsNullOrWhiteSpace(monoAccountId))
                    await MarkReauthRequiredAsync(monoAccountId, ct);
                break;

            default:
                _logger.LogDebug("Mono webhook: unhandled event type {EventType}", eventType);
                break;
        }

        return Ok(new { received = true });
    }

    private bool IsValidSignature(string rawBody, string receivedSignature)
    {
        if (string.IsNullOrWhiteSpace(_options.WebhookSecret))
            return true; // Dev mode: no secret configured — accept all

        var keyBytes = Encoding.UTF8.GetBytes(_options.WebhookSecret);
        var bodyBytes = Encoding.UTF8.GetBytes(rawBody);
        var hash = HMACSHA512.HashData(keyBytes, bodyBytes);
        var expected = Convert.ToHexStringLower(hash);

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(receivedSignature.ToLowerInvariant()));
    }

    private async Task TriggerSyncAsync(string monoAccountId, CancellationToken ct)
    {
        var account = await _accounts.GetByMonoAccountIdAsync(monoAccountId, ct);
        if (account is null)
        {
            _logger.LogDebug("Webhook sync: account {MonoAccountId} not found in DB, skipping.", monoAccountId);
            return;
        }
        await _sync.SyncAccountAsync(account, ct);
    }

    private async Task MarkReauthRequiredAsync(string monoAccountId, CancellationToken ct)
    {
        var account = await _accounts.GetByMonoAccountIdAsync(monoAccountId, ct);
        if (account is null) return;

        account.MarkReauthRequired();
        await _accounts.SaveChangesAsync(ct);
        _logger.LogInformation("Account {AccountId} ({Bank}) marked as ReauthRequired.", account.Id, account.BankName);
    }
}
