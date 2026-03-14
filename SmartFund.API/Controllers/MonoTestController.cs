using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.API.Controllers;

/// <summary>
/// Developer-only proxy for Mono API calls during testing.
/// The browser cannot call Mono directly (CORS), so this controller
/// relays requests server-side using the secret key supplied by the caller.
/// </summary>
[ApiController]
[Authorize]
[Route("api/mono-test")]
public sealed class MonoTestController : ControllerBase
{
    private const string MonoBaseUrl = "https://api.withmono.com";
    private const string SecretKeyHeader = "X-Mono-Secret-Key";
    private const int MaxConnectedAccounts = 5;

    private readonly IHttpClientFactory _http;
    private readonly IConnectedBankAccountRepository _accounts;

    public MonoTestController(IHttpClientFactory http, IConnectedBankAccountRepository accounts)
    {
        _http = http;
        _accounts = accounts;
    }

    // ── Mono proxy endpoints ─────────────────────────────────────────────────

    // POST api/mono-test/exchange  — exchange auth code for permanent account ID
    [HttpPost("exchange")]
    public async Task<IActionResult> Exchange(
        [FromHeader(Name = SecretKeyHeader)] string? secretKey,
        [FromBody] ExchangeRequest body,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(secretKey))
            return BadRequest(new { error = "X-Mono-Secret-Key header is required." });

        var client = _http.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Post, $"{MonoBaseUrl}/v2/accounts/auth");
        req.Headers.Add("mono-sec-key", secretKey);
        req.Content = new StringContent(
            JsonSerializer.Serialize(new { code = body.Code }),
            Encoding.UTF8,
            "application/json");

        var res = await client.SendAsync(req, ct);
        var json = await res.Content.ReadAsStringAsync(ct);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var accountId = TryGetString(
            root,
            ("data", "id"),
            ("data", "account_id"),
            ("data", "accountId"),
            (null, "id"),
            (null, "account_id"),
            (null, "accountId"));

        if (!res.IsSuccessStatusCode)
            return StatusCode((int)res.StatusCode, root);

        if (string.IsNullOrWhiteSpace(accountId))
            return BadRequest(new { error = "Mono auth response did not include an account id.", raw = root });

        return Ok(new { id = accountId });
    }

    // GET api/mono-test/accounts/{id}  — fetch account details from Mono
    [HttpGet("accounts/{accountId}")]
    public async Task<IActionResult> GetAccount(
        string accountId,
        [FromHeader(Name = SecretKeyHeader)] string? secretKey,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(secretKey))
            return BadRequest(new { error = "X-Mono-Secret-Key header is required." });

        var client = _http.CreateClient();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{MonoBaseUrl}/v2/accounts/{accountId}");
        req.Headers.Add("mono-sec-key", secretKey);
        var res = await client.SendAsync(req, ct);
        var json = await res.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!res.IsSuccessStatusCode)
            return StatusCode((int)res.StatusCode, root);

        var data = root.TryGetProperty("data", out var d) ? d : root;

        decimal? balance = TryGetDecimal(data, "balance", "available_balance", "availableBalance", "current_balance", "currentBalance");
        var currency = TryGetString(data, (null, "currency")) ?? "NGN";

        try
        {
            var balanceReq = new HttpRequestMessage(HttpMethod.Get, $"{MonoBaseUrl}/v2/accounts/{accountId}/balance");
            balanceReq.Headers.Add("mono-sec-key", secretKey);

            var balanceRes = await client.SendAsync(balanceReq, ct);
            if (balanceRes.IsSuccessStatusCode)
            {
                var balanceJson = await balanceRes.Content.ReadAsStringAsync(ct);
                using var balanceDoc = JsonDocument.Parse(balanceJson);
                var balanceRoot = balanceDoc.RootElement;
                var balanceData = balanceRoot.TryGetProperty("data", out var bd) ? bd : balanceRoot;

                balance = TryGetDecimal(balanceData, "balance", "available_balance", "availableBalance", "current_balance", "currentBalance") ?? balance;
                currency = TryGetString(balanceData, (null, "currency")) ?? currency;
            }
        }
        catch
        {
            // Fall back to whatever balance we already have.
        }

        var inst = data.TryGetProperty("institution", out var i) ? i : default;
        var account = new
        {
            name = TryGetString(data, (null, "name")) ?? string.Empty,
            accountNumber = TryGetString(data, (null, "accountNumber"), (null, "account_number"), (null, "accountNo"), (null, "account_no")) ?? string.Empty,
            balance = balance ?? 0m,
            currency,
            institution = new
            {
                name = inst.ValueKind == JsonValueKind.Object ? TryGetString(inst, (null, "name")) ?? string.Empty : string.Empty,
                bankCode = inst.ValueKind == JsonValueKind.Object ? (TryGetString(inst, (null, "bankCode"), (null, "bank_code"), (null, "code")) ?? string.Empty) : string.Empty,
                type = inst.ValueKind == JsonValueKind.Object ? TryGetString(inst, (null, "type")) ?? string.Empty : string.Empty,
            },
            type = TryGetString(data, (null, "type")) ?? string.Empty,
            status = TryGetString(data, (null, "status")) ?? string.Empty,
        };

        return Ok(new { account });
    }

    // GET api/mono-test/accounts/{id}/transactions  — fetch transactions from Mono
    [HttpGet("accounts/{accountId}/transactions")]
    public async Task<IActionResult> GetTransactions(
        string accountId,
        [FromHeader(Name = SecretKeyHeader)] string? secretKey,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(secretKey))
            return BadRequest(new { error = "X-Mono-Secret-Key header is required." });

        var client = _http.CreateClient();
        var req = new HttpRequestMessage(HttpMethod.Get, $"{MonoBaseUrl}/v2/accounts/{accountId}/transactions");
        req.Headers.Add("mono-sec-key", secretKey);

        var res = await client.SendAsync(req, ct);
        var json = await res.Content.ReadAsStringAsync(ct);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (!res.IsSuccessStatusCode)
            return StatusCode((int)res.StatusCode, root);

        JsonElement txArray;

        if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            txArray = data;
        }
        else if (root.TryGetProperty("data", out var dataObj)
                 && dataObj.ValueKind == JsonValueKind.Object
                 && dataObj.TryGetProperty("transactions", out var txs)
                 && txs.ValueKind == JsonValueKind.Array)
        {
            txArray = txs;
        }
        else
        {
            return Ok(new { data = Array.Empty<object>(), raw = root });
        }

        var normalized = new List<object>();
        foreach (var tx in txArray.EnumerateArray())
        {
            if (tx.ValueKind != JsonValueKind.Object)
                continue;

            normalized.Add(new
            {
                _id = TryGetString(tx, (null, "_id"), (null, "id")) ?? string.Empty,
                narration = TryGetString(tx, (null, "narration"), (null, "description"), (null, "summary")) ?? string.Empty,
                type = TryGetString(tx, (null, "type")) ?? string.Empty,
                date = TryGetString(tx, (null, "date"), (null, "created_at"), (null, "createdAt")) ?? string.Empty,
                amount = TryGetDecimal(tx, "amount") ?? 0m,
                balance = TryGetDecimal(tx, "balance") ?? 0m,
            });
        }

        return Ok(new { data = normalized });
    }

    // ── Persistent connected accounts ────────────────────────────────────────

    // GET api/mono-test/connected-accounts
    [HttpGet("connected-accounts")]
    public async Task<IActionResult> ListConnectedAccounts(CancellationToken ct)
    {
        var list = await _accounts.ListAsync(ct);
        return Ok(list.Select(a => new
        {
            a.Id,
            a.MonoAccountId,
            a.BankName,
            a.AccountNumber,
            a.AccountName,
            a.AccountType,
            a.Currency,
            a.LastKnownBalanceKobo,
            a.LastSyncedAtUtc,
            a.ConnectedAtUtc,
        }));
    }

    // POST api/mono-test/connected-accounts  — save or update a connected account
    [HttpPost("connected-accounts")]
    public async Task<IActionResult> SaveConnectedAccount(
        [FromBody] SaveConnectedAccountRequest body,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.MonoAccountId))
            return BadRequest(new { error = "monoAccountId is required." });

        var bankName = string.IsNullOrWhiteSpace(body.BankName) ? "Bank" : body.BankName.Trim();
        var accountNumber = string.IsNullOrWhiteSpace(body.AccountNumber) ? "0000" : body.AccountNumber.Trim();
        var accountName = string.IsNullOrWhiteSpace(body.AccountName) ? "Unknown" : body.AccountName.Trim();
        var accountType = string.IsNullOrWhiteSpace(body.AccountType) ? "unknown" : body.AccountType.Trim();
        var currency = string.IsNullOrWhiteSpace(body.Currency) ? "NGN" : body.Currency.Trim();

        // Check for duplicate first (idempotent — just update balance)
        var existing = await _accounts.GetByMonoAccountIdAsync(body.MonoAccountId, ct);
        if (existing is not null)
        {
            existing.UpdateBalance(body.BalanceKobo, DateTime.UtcNow);
            await _accounts.SaveChangesAsync(ct);
            return Ok(new
            {
                existing.Id,
                existing.MonoAccountId,
                existing.BankName,
                existing.AccountNumber,
                existing.AccountName,
                existing.AccountType,
                existing.Currency,
                existing.LastKnownBalanceKobo,
                existing.LastSyncedAtUtc,
                existing.ConnectedAtUtc,
            });
        }

        var count = await _accounts.CountAsync(ct);
        if (count >= MaxConnectedAccounts)
            return BadRequest(new { error = $"You can connect a maximum of {MaxConnectedAccounts} bank accounts." });

        var account = ConnectedBankAccount.Create(
            body.MonoAccountId,
            bankName,
            accountNumber,
            accountName,
            accountType,
            currency,
            body.BalanceKobo,
            DateTime.UtcNow);

        await _accounts.AddAsync(account, ct);
        await _accounts.SaveChangesAsync(ct);

        return Ok(new
        {
            account.Id,
            account.MonoAccountId,
            account.BankName,
            account.AccountNumber,
            account.AccountName,
            account.AccountType,
            account.Currency,
            account.LastKnownBalanceKobo,
            account.LastSyncedAtUtc,
            account.ConnectedAtUtc,
        });
    }

    // DELETE api/mono-test/connected-accounts/{id}
    [HttpDelete("connected-accounts/{id:long}")]
    public async Task<IActionResult> RemoveConnectedAccount(long id, CancellationToken ct)
    {
        var account = await _accounts.GetByIdAsync(id, ct);
        if (account is null)
            return NotFound(new { error = "Connected account not found." });

        await _accounts.RemoveAsync(account, ct);
        await _accounts.SaveChangesAsync(ct);
        return Ok(new { deleted = true });
    }

    // POST api/mono-test/connected-accounts/{id}/sync-balance
    // Fetches fresh balance from Mono and updates the stored record.
    [HttpPost("connected-accounts/{id:long}/sync-balance")]
    public async Task<IActionResult> SyncBalance(
        long id,
        [FromHeader(Name = SecretKeyHeader)] string? secretKey,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(secretKey))
            return BadRequest(new { error = "X-Mono-Secret-Key header is required." });

        var account = await _accounts.GetByIdAsync(id, ct);
        if (account is null)
            return NotFound(new { error = "Connected account not found." });

        var client = _http.CreateClient();
        var balanceReq = new HttpRequestMessage(HttpMethod.Get, $"{MonoBaseUrl}/v2/accounts/{account.MonoAccountId}/balance");
        balanceReq.Headers.Add("mono-sec-key", secretKey);

        var balanceRes = await client.SendAsync(balanceReq, ct);
        if (!balanceRes.IsSuccessStatusCode)
        {
            var errJson = await balanceRes.Content.ReadAsStringAsync(ct);
            using var errDoc = JsonDocument.Parse(errJson);
            return StatusCode((int)balanceRes.StatusCode, errDoc.RootElement);
        }

        var balanceJson = await balanceRes.Content.ReadAsStringAsync(ct);
        using var balanceDoc = JsonDocument.Parse(balanceJson);
        var balanceRoot = balanceDoc.RootElement;
        var balanceData = balanceRoot.TryGetProperty("data", out var bd) ? bd : balanceRoot;

        var freshBalance = TryGetDecimal(balanceData, "balance", "available_balance", "availableBalance", "current_balance", "currentBalance") ?? 0m;
        account.UpdateBalance((long)freshBalance, DateTime.UtcNow);
        await _accounts.SaveChangesAsync(ct);

        return Ok(new
        {
            account.Id,
            account.MonoAccountId,
            account.BankName,
            account.AccountNumber,
            account.AccountName,
            account.AccountType,
            account.Currency,
            account.LastKnownBalanceKobo,
            account.LastSyncedAtUtc,
            account.ConnectedAtUtc,
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

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

            if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty(parent, out var obj) || obj.ValueKind != JsonValueKind.Object)
                continue;

            if (obj.TryGetProperty(name, out var val) && val.ValueKind == JsonValueKind.String)
                return val.GetString();
        }

        return null;
    }

    private static decimal? TryGetDecimal(JsonElement root, params string[] names)
    {
        if (root.ValueKind != JsonValueKind.Object)
            return null;

        foreach (var name in names)
        {
            if (!root.TryGetProperty(name, out var val))
                continue;

            if (val.ValueKind == JsonValueKind.Number && val.TryGetDecimal(out var d))
                return d;

            if (val.ValueKind == JsonValueKind.String && decimal.TryParse(val.GetString(), out var ds))
                return ds;
        }

        return null;
    }
}

public sealed record ExchangeRequest(string Code);
public sealed record SaveConnectedAccountRequest(
    string MonoAccountId,
    string BankName,
    string AccountNumber,
    string AccountName,
    string AccountType,
    string Currency,
    long BalanceKobo);
