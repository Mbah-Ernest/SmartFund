using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Infrastructure.BankSync; // MonoOptions configuration type

namespace SmartFund.API.Controllers;

/// <summary>
/// Receives webhook events from Mono and triggers the appropriate actions.
/// Supports either a shared-secret header or an HMAC-SHA512 signature header.
/// </summary>
[ApiController]
[Route("api/webhooks/mono")]
public sealed class MonoWebhookController : ControllerBase
{
    private readonly MonoOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MonoWebhookController> _logger;

    public MonoWebhookController(
        IServiceScopeFactory scopeFactory,
        IOptions<MonoOptions> options,
        ILogger<MonoWebhookController> logger)
    {
        _options = options.Value;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Receive(CancellationToken ct)
    {
        // Read raw body for HMAC verification
        Request.EnableBuffering();
        var rawBody = await new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true).ReadToEndAsync(ct);
        Request.Body.Position = 0;

        // Validate secret/signature (if configured)
        if (!IsValidWebhook(rawBody, out var validationError))
        {
            _logger.LogWarning("Mono webhook validation failed: {Error}", validationError);
            return Unauthorized(new { error = validationError });
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(rawBody);
        }
        catch (JsonException)
        {
            return BadRequest(new { error = "Invalid JSON." });
        }

        using (doc)
        {
            var root = doc.RootElement;

            var eventType = TryGetString(root,
                (null, "event"),
                (null, "type"),
                ("data", "event"),
                ("data", "type")) ?? string.Empty;

            var monoAccountId = TryGetString(root,
                (null, "mono_id"),
                (null, "account_id"),
                (null, "accountId"),
                ("data", "mono_id"),
                ("data", "account_id"),
                ("data", "accountId"),
                ("data", "id"),
                ("data.account", "id"));

            _logger.LogInformation("Mono webhook received: {EventType} for account {MonoAccountId}", eventType, monoAccountId);

            // Event names vary by Mono configuration/version. Handle the common ones.
            var evt = eventType.ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(monoAccountId))
            {
                if (evt.Contains("reauth", StringComparison.OrdinalIgnoreCase))
                {
                    _ = TriggerMarkReauthRequiredAsync(monoAccountId);
                }
                else if (evt.Contains("sync", StringComparison.OrdinalIgnoreCase)
                         || evt.Contains("job", StringComparison.OrdinalIgnoreCase)
                         || evt.Contains("account_updated", StringComparison.OrdinalIgnoreCase)
                         || evt == "job_update"
                         || evt == "sync_success"
                         || evt == "sync_failed")
                {
                    _ = TriggerSyncInBackgroundAsync(monoAccountId);
                }
            }
        }

        return Ok(new { received = true });
    }

    private bool IsValidWebhook(string rawBody, out string? error)
    {
        error = null;

        if (string.IsNullOrWhiteSpace(_options.WebhookSecret)
            || _options.WebhookSecret.StartsWith("replace_", StringComparison.OrdinalIgnoreCase))
        {
            return true; // Dev mode: secret not configured — accept all
        }

        // Shared-secret header (simplest). Mono dashboard sometimes sends the same secret back.
        var providedSecret = Request.Headers["mono-webhook-secret"].ToString();
        if (string.IsNullOrWhiteSpace(providedSecret))
            providedSecret = Request.Headers["x-mono-webhook-secret"].ToString();

        if (!string.IsNullOrWhiteSpace(providedSecret))
        {
            if (FixedEquals(providedSecret, _options.WebhookSecret))
                return true;

            // If it doesn't match, it might actually be a signature; fall through.
        }

        // Signature header (HMAC-SHA512 over raw request body)
        var receivedSignature = Request.Headers["mono-signature"].ToString();
        if (string.IsNullOrWhiteSpace(receivedSignature))
            receivedSignature = Request.Headers["x-mono-signature"].ToString();
        if (string.IsNullOrWhiteSpace(receivedSignature))
            receivedSignature = Request.Headers["mono-webhook-secret"].ToString();

        if (string.IsNullOrWhiteSpace(receivedSignature))
        {
            error = "Missing webhook secret/signature header.";
            return false;
        }

        receivedSignature = receivedSignature.Trim();
        if (receivedSignature.StartsWith("sha512=", StringComparison.OrdinalIgnoreCase))
            receivedSignature = receivedSignature[7..];

        var expected = ComputeHmacSha512Hex(_options.WebhookSecret, rawBody);
        if (FixedEquals(expected, receivedSignature.ToLowerInvariant()))
            return true;

        error = "Invalid webhook signature/secret.";
        return false;
    }

    private static bool FixedEquals(string a, string b)
    {
        var ba = Encoding.UTF8.GetBytes(a);
        var bb = Encoding.UTF8.GetBytes(b);
        return ba.Length == bb.Length && CryptographicOperations.FixedTimeEquals(ba, bb);
    }

    private static string ComputeHmacSha512Hex(string secret, string payload)
    {
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var bodyBytes = Encoding.UTF8.GetBytes(payload);
        var hash = HMACSHA512.HashData(keyBytes, bodyBytes);
        return Convert.ToHexStringLower(hash);
    }

    private Task TriggerSyncInBackgroundAsync(string monoAccountId)
    {
        return Task.Run(async () =>
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var accounts = scope.ServiceProvider.GetRequiredService<IConnectedBankAccountRepository>();
                var sync = scope.ServiceProvider.GetRequiredService<BankSyncService>();

                var account = await accounts.GetByMonoAccountIdAsync(monoAccountId, CancellationToken.None);
                if (account is null)
                {
                    _logger.LogDebug("Webhook sync: account {MonoAccountId} not found in DB, skipping.", monoAccountId);
                    return;
                }

                await sync.SyncAccountAsync(account, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhook-triggered sync failed for MonoAccountId={MonoAccountId}", monoAccountId);
            }
        }, CancellationToken.None);
    }

    private Task TriggerMarkReauthRequiredAsync(string monoAccountId)
    {
        return Task.Run(async () =>
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var accounts = scope.ServiceProvider.GetRequiredService<IConnectedBankAccountRepository>();

                var account = await accounts.GetByMonoAccountIdAsync(monoAccountId, CancellationToken.None);
                if (account is null) return;

                account.MarkReauthRequired();
                await accounts.SaveChangesAsync(CancellationToken.None);
                _logger.LogInformation("Account {AccountId} ({Bank}) marked as ReauthRequired.", account.Id, account.BankName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhook-triggered reauth mark failed for MonoAccountId={MonoAccountId}", monoAccountId);
            }
        }, CancellationToken.None);
    }

    private static string? TryGetString(JsonElement root, params (string? parent, string name)[] paths)
    {
        foreach (var (parent, name) in paths)
        {
            if (parent is null)
            {
                if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String)
                    return p.GetString();
                continue;
            }

            JsonElement obj = root;
            foreach (var seg in parent.Split('.', StringSplitOptions.RemoveEmptyEntries))
            {
                if (obj.ValueKind != JsonValueKind.Object || !obj.TryGetProperty(seg, out var next) || next.ValueKind != JsonValueKind.Object)
                {
                    obj = default;
                    break;
                }
                obj = next;
            }

            if (obj.ValueKind == JsonValueKind.Object && obj.TryGetProperty(name, out var val) && val.ValueKind == JsonValueKind.String)
                return val.GetString();
        }

        return null;
    }
}
