using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartFund.Application.Interfaces;

namespace SmartFund.Infrastructure.BankSync
{
    public sealed class MonoOptions
    {
        public string PublicKey { get; set; } = string.Empty;
        public string SecretKey { get; set; } = string.Empty;
        public string WebhookSecret { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = "https://api.withmono.com";
        public int BackfillMonths { get; set; } = 3;
        public int SyncIntervalMinutes { get; set; } = 15;
    }

    public sealed class MonoApiClient : IMonoApiClient
    {
        private readonly HttpClient _http;
        private readonly IOptionsMonitor<MonoOptions> _options;
        private readonly ILogger<MonoApiClient> _logger;

        public MonoApiClient(HttpClient http, IOptionsMonitor<MonoOptions> options, ILogger<MonoApiClient> logger)
        {
            _http = http;
            _options = options;
            _logger = logger;

            _http.BaseAddress = new Uri(_options.CurrentValue.BaseUrl.TrimEnd('/') + "/");
            _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        private async Task<(HttpResponseMessage res, string json)> SendAsync(
            HttpMethod method,
            string relativeUrl,
            HttpContent? content,
            bool requiresSecret,
            CancellationToken ct)
        {
            var opts = _options.CurrentValue;

            if (requiresSecret && string.IsNullOrWhiteSpace(opts.SecretKey))
                throw new InvalidOperationException("Mono SecretKey is not configured.");

            // Keep BaseAddress in sync in case config is changed without restart.
            var baseUrl = opts.BaseUrl.TrimEnd('/') + "/";
            if (_http.BaseAddress is null || !string.Equals(_http.BaseAddress.ToString(), baseUrl, StringComparison.OrdinalIgnoreCase))
                _http.BaseAddress = new Uri(baseUrl);

            // Basic retry for transient DNS/network issues.
            for (var attempt = 1; attempt <= 3; attempt++)
            {
                try
                {
                    using var req = new HttpRequestMessage(method, relativeUrl);
                    if (content is not null)
                        req.Content = content;

                    if (!string.IsNullOrWhiteSpace(opts.SecretKey))
                        req.Headers.TryAddWithoutValidation("mono-sec-key", opts.SecretKey);

                    var res = await _http.SendAsync(req, ct);
                    var json = await res.Content.ReadAsStringAsync(ct);
                    return (res, json);
                }
                catch (HttpRequestException ex) when (attempt < 3 && (ex.InnerException is SocketException))
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(250 * attempt), ct);
                }
            }

            // Unreachable, but required by compiler.
            throw new InvalidOperationException("Mono request failed after retries.");
        }

        /// <inheritdoc/>
        public async Task<string> ExchangeCodeAsync(string authCode, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(authCode))
                throw new InvalidOperationException("Mono auth identifier is required.");

            // Mono's Connect widget payload naming has varied across versions ("id" vs "code").
            // Try the most common shape first, then fall back.
            async Task<(HttpResponseMessage res, string json)> PostAsync(object payload)
            {
                var body = JsonSerializer.Serialize(payload);
                var content = new StringContent(body, Encoding.UTF8, "application/json");
                return await SendAsync(HttpMethod.Post, "v2/accounts/auth", content, requiresSecret: true, ct);
            }

            var (response, json) = await PostAsync(new { id = authCode });
            if (!response.IsSuccessStatusCode)
            {
                // Fall back to the older/alternate field name.
                var (response2, json2) = await PostAsync(new { code = authCode });
                response = response2;
                json = json2;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Mono auth exchange failed ({Status}): {Body}", response.StatusCode, json);
                throw new InvalidOperationException($"Mono auth exchange failed: {ExtractError(json)}");
            }

            var node = JsonNode.Parse(json);
            var accountId = node?["data"]?["id"]?.GetValue<string>()
                ?? node?["data"]?["account_id"]?.GetValue<string>()
                ?? node?["data"]?["accountId"]?.GetValue<string>()
                ?? node?["id"]?.GetValue<string>()
                ?? node?["account_id"]?.GetValue<string>()
                ?? node?["accountId"]?.GetValue<string>();

            return !string.IsNullOrWhiteSpace(accountId)
                ? accountId
                : throw new InvalidOperationException("Mono exchange response missing account id.");
        }

        /// <inheritdoc/>
        public async Task<MonoAccountInfo> GetAccountInfoAsync(string monoAccountId, CancellationToken ct)
        {
            var (response, json) = await SendAsync(HttpMethod.Get, $"v2/accounts/{monoAccountId}", content: null, requiresSecret: true, ct);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Mono get account failed: {ExtractError(json)}");

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var data = root.TryGetProperty("data", out var d) ? d : root;

            // Some responses nest under `account`, others return fields directly.
            var account = data.TryGetProperty("account", out var a) ? a : data;
            JsonElement institution = default;
            if (data.TryGetProperty("institution", out var inst)) institution = inst;
            else if (account.ValueKind == JsonValueKind.Object && account.TryGetProperty("institution", out var inst2)) institution = inst2;

            var bankName = TryGetString(institution, (null, "name"))
                          ?? TryGetString(data, (null, "institution"))
                          ?? "Unknown Bank";

            var accountNumber = TryGetString(account,
                    (null, "accountNumber"),
                    (null, "account_number"),
                    (null, "accountNo"),
                    (null, "account_no"))
                ?? TryGetString(data,
                    (null, "accountNumber"),
                    (null, "account_number"),
                    (null, "accountNo"),
                    (null, "account_no"))
                ?? string.Empty;

            var accountName = TryGetString(account, (null, "name"))
                ?? TryGetString(data, (null, "name"))
                ?? string.Empty;

            var accountType = TryGetString(account, (null, "type"))
                ?? TryGetString(data, (null, "type"))
                ?? string.Empty;

            var currency = TryGetString(account, (null, "currency"))
                ?? TryGetString(data, (null, "currency"))
                ?? "NGN";

            var balance = TryGetLong(account, "balance", "available_balance", "availableBalance", "current_balance", "currentBalance")
                ?? TryGetLong(data, "balance", "available_balance", "availableBalance", "current_balance", "currentBalance")
                ?? 0L;

            return new MonoAccountInfo
            {
                MonoAccountId = monoAccountId,
                BankName = bankName,
                AccountNumber = accountNumber,
                AccountName = accountName,
                AccountType = accountType,
                Currency = currency,
                BalanceKobo = balance,
            };
        }

        /// <inheritdoc/>
        public async Task<List<MonoTransaction>> GetTransactionsAsync(
            string monoAccountId, DateTime? since, CancellationToken ct)
        {
            // Mono supports pagination via query params. Avoid non-standard flags like `paginate=false`
            // since API versions differ and may reject them.
            var url = $"v2/accounts/{monoAccountId}/transactions";
            var qs = new List<string> { "page=1", "limit=500" };
            if (since.HasValue)
            {
                // Mono requires a complete period range when filtering by date.
                // Provide both start and end (end defaults to today).
                qs.Add($"start={since.Value:dd-MM-yyyy}");
                qs.Add($"end={DateTime.UtcNow:dd-MM-yyyy}");
            }
            url += "?" + string.Join("&", qs);

            var (response, json) = await SendAsync(HttpMethod.Get, url, content: null, requiresSecret: true, ct);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Mono get transactions failed: {ExtractError(json)}");

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            JsonElement txArray = default;
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
            else if (root.TryGetProperty("transactions", out var txs2) && txs2.ValueKind == JsonValueKind.Array)
            {
                txArray = txs2;
            }

            if (txArray.ValueKind != JsonValueKind.Array) return [];

            var results = new List<MonoTransaction>();
            foreach (var tx in txArray.EnumerateArray())
            {
                if (tx.ValueKind != JsonValueKind.Object) continue;

                var id = TryGetString(tx, (null, "_id"), (null, "id")) ?? string.Empty;
                if (string.IsNullOrWhiteSpace(id)) continue;

                var amount = TryGetLong(tx, "amount") ?? 0L;
                var dateStr = TryGetString(tx, (null, "date"), (null, "created_at"), (null, "createdAt"));
                DateTime.TryParse(dateStr, out var date);

                results.Add(new MonoTransaction
                {
                    Id = id,
                    Narration = TryGetString(tx, (null, "narration"), (null, "description"), (null, "summary")) ?? string.Empty,
                    Amount = Math.Abs(amount),
                    Type = (TryGetString(tx, (null, "type")) ?? string.Empty).ToLowerInvariant(),
                    Date = date == default ? DateTime.UtcNow : date,
                    Pending = tx.TryGetProperty("pending", out var pending) && pending.ValueKind == JsonValueKind.True
                });
            }

            return results;
        }

        /// <inheritdoc/>
        public async Task<string> GenerateConnectTokenAsync(CancellationToken ct)
        {
            // Mono Connect widget can be initialized with the public key.
            // Prefer returning the configured public key to avoid an extra network hop and
            // to keep dev/test environments working even if token generation is unavailable.
            var opts = _options.CurrentValue;
            if (!string.IsNullOrWhiteSpace(opts.PublicKey))
                return opts.PublicKey;

            var (response, json) = await SendAsync(
                HttpMethod.Post,
                "v2/connect/token",
                new StringContent("{}", Encoding.UTF8, "application/json"),
                requiresSecret: true,
                ct);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Mono connect token generation failed: {json}");

            var node = JsonNode.Parse(json);
            return node?["token"]?.GetValue<string>()
                ?? node?["data"]?["token"]?.GetValue<string>()
                ?? throw new InvalidOperationException("Mono connect token response missing token.");
        }

        private static string ExtractError(string json)
        {
            if (string.IsNullOrWhiteSpace(json)) return "(empty response)";

            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.ValueKind == JsonValueKind.Object)
                {
                    if (root.TryGetProperty("message", out var msg) && msg.ValueKind == JsonValueKind.String)
                        return msg.GetString() ?? json;

                    if (root.TryGetProperty("error", out var err) && err.ValueKind == JsonValueKind.String)
                        return err.GetString() ?? json;

                    if (root.TryGetProperty("errors", out var errs) && errs.ValueKind == JsonValueKind.Array && errs.GetArrayLength() > 0)
                    {
                        var first = errs[0];
                        if (first.ValueKind == JsonValueKind.Object && first.TryGetProperty("message", out var em) && em.ValueKind == JsonValueKind.String)
                            return em.GetString() ?? json;
                    }

                    if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
                    {
                        if (data.TryGetProperty("message", out var dmsg) && dmsg.ValueKind == JsonValueKind.String)
                            return dmsg.GetString() ?? json;
                        if (data.TryGetProperty("error", out var derr) && derr.ValueKind == JsonValueKind.String)
                            return derr.GetString() ?? json;
                    }
                }
            }
            catch
            {
                // ignore parse issues
            }

            // As a last resort, trim to avoid dumping huge JSON into UI.
            return json.Length <= 300 ? json : json[..300] + "…";
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

                if (root.ValueKind != JsonValueKind.Object || !root.TryGetProperty(parent, out var obj) || obj.ValueKind != JsonValueKind.Object)
                    continue;

                if (obj.TryGetProperty(name, out var val) && val.ValueKind == JsonValueKind.String)
                    return val.GetString();
            }

            return null;
        }

        private static long? TryGetLong(JsonElement root, params string[] names)
        {
            if (root.ValueKind != JsonValueKind.Object)
                return null;

            foreach (var name in names)
            {
                if (!root.TryGetProperty(name, out var val))
                    continue;

                if (val.ValueKind == JsonValueKind.Number && val.TryGetInt64(out var l))
                    return l;

                if (val.ValueKind == JsonValueKind.String && long.TryParse(val.GetString(), out var ls))
                    return ls;
            }

            return null;
        }
    }
}
