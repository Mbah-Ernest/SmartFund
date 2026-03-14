using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
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
        public string SecretKey { get; set; } = string.Empty;
        public string WebhookSecret { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = "https://api.withmono.com";
        public int BackfillMonths { get; set; } = 3;
        public int SyncIntervalMinutes { get; set; } = 15;
    }

    public sealed class MonoApiClient : IMonoApiClient
    {
        private readonly HttpClient _http;
        private readonly MonoOptions _options;
        private readonly ILogger<MonoApiClient> _logger;

        public MonoApiClient(HttpClient http, IOptions<MonoOptions> options, ILogger<MonoApiClient> logger)
        {
            _http = http;
            _options = options.Value;
            _logger = logger;

            _http.BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/') + "/");
            _http.DefaultRequestHeaders.Add("mono-sec-key", _options.SecretKey);
            _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        /// <inheritdoc/>
        public async Task<string> ExchangeCodeAsync(string authCode, CancellationToken ct)
        {
            var body = JsonSerializer.Serialize(new { code = authCode });
            var content = new StringContent(body, Encoding.UTF8, "application/json");

            var response = await _http.PostAsync("v2/accounts/auth", content, ct);
            var json = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Mono code exchange failed ({Status}): {Body}", response.StatusCode, json);
                throw new InvalidOperationException($"Mono code exchange failed: {json}");
            }

            var node = JsonNode.Parse(json);
            return node?["id"]?.GetValue<string>()
                ?? node?["data"]?["id"]?.GetValue<string>()
                ?? throw new InvalidOperationException("Mono exchange response missing account id.");
        }

        /// <inheritdoc/>
        public async Task<MonoAccountInfo> GetAccountInfoAsync(string monoAccountId, CancellationToken ct)
        {
            var response = await _http.GetAsync($"v2/accounts/{monoAccountId}", ct);
            var json = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Mono get account failed: {json}");

            var node = JsonNode.Parse(json);
            var data = node?["data"] ?? node;
            var account = data?["account"] ?? data;
            var institution = data?["institution"] ?? data?["account"]?["institution"];

            long balance = 0;
            long.TryParse(
                data?["account"]?["balance"]?.ToString()
                ?? data?["balance"]?.ToString(), out balance);

            return new MonoAccountInfo
            {
                MonoAccountId = monoAccountId,
                BankName = institution?["name"]?.GetValue<string>() ?? "Unknown Bank",
                AccountNumber = account?["accountNumber"]?.GetValue<string>()
                    ?? data?["accountNumber"]?.GetValue<string>() ?? string.Empty,
                AccountName = account?["name"]?.GetValue<string>()
                    ?? data?["name"]?.GetValue<string>() ?? string.Empty,
                AccountType = account?["type"]?.GetValue<string>()
                    ?? data?["type"]?.GetValue<string>() ?? string.Empty,
                Currency = account?["currency"]?.GetValue<string>()
                    ?? data?["currency"]?.GetValue<string>() ?? "NGN",
                BalanceKobo = balance
            };
        }

        /// <inheritdoc/>
        public async Task<List<MonoTransaction>> GetTransactionsAsync(
            string monoAccountId, DateTime? since, CancellationToken ct)
        {
            var url = $"v2/accounts/{monoAccountId}/transactions?paginate=false";
            if (since.HasValue)
                url += $"&start={since.Value:yyyy-MM-dd}";

            var response = await _http.GetAsync(url, ct);
            var json = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Mono get transactions failed: {json}");

            var node = JsonNode.Parse(json);
            var dataArray = node?["data"] as JsonArray
                ?? node?["transactions"] as JsonArray;

            if (dataArray is null) return [];

            var results = new List<MonoTransaction>();
            foreach (var item in dataArray)
            {
                if (item is null) continue;
                var id = item["_id"]?.GetValue<string>() ?? item["id"]?.GetValue<string>() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(id)) continue;

                long.TryParse(item["amount"]?.ToString(), out long amount);
                DateTime.TryParse(item["date"]?.GetValue<string>(), out var date);

                results.Add(new MonoTransaction
                {
                    Id = id,
                    Narration = item["narration"]?.GetValue<string>() ?? string.Empty,
                    Amount = Math.Abs(amount),
                    Type = (item["type"]?.GetValue<string>() ?? string.Empty).ToLowerInvariant(),
                    Date = date == default ? DateTime.UtcNow : date,
                    Pending = item["pending"]?.GetValue<bool>() ?? false
                });
            }

            return results;
        }

        /// <inheritdoc/>
        public async Task<string> GenerateConnectTokenAsync(CancellationToken ct)
        {
            var response = await _http.PostAsync(
                "v2/connect/token",
                new StringContent("{}", Encoding.UTF8, "application/json"),
                ct);
            var json = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException($"Mono connect token generation failed: {json}");

            var node = JsonNode.Parse(json);
            return node?["token"]?.GetValue<string>()
                ?? node?["data"]?["token"]?.GetValue<string>()
                ?? throw new InvalidOperationException("Mono connect token response missing token.");
        }
    }
}
