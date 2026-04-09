using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartFund.Application.Interfaces;

namespace SmartFund.Infrastructure.Ai
{
    public sealed class ClaudeApiClient : IClaudeApiClient
    {
        private readonly HttpClient _http;
        private readonly string _apiKey;
        private readonly ILogger<ClaudeApiClient> _logger;
        private const string Model = "claude-haiku-4-5-20251001";
        private const string ApiVersion = "2023-06-01";

        public ClaudeApiClient(HttpClient http, IConfiguration config, ILogger<ClaudeApiClient> logger)
        {
            _http = http;
            _apiKey = config["Claude:ApiKey"] ?? "";
            _logger = logger;
        }

        public async Task<string> CompleteAsync(string systemPrompt, string userMessage, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(_apiKey))
                throw new InvalidOperationException("Claude API key is not configured. Set Claude:ApiKey in appsettings.");

            var request = new
            {
                model = Model,
                max_tokens = 1024,
                system = systemPrompt,
                messages = new[] { new { role = "user", content = userMessage } }
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            req.Headers.Add("x-api-key", _apiKey);
            req.Headers.Add("anthropic-version", ApiVersion);
            req.Content = JsonContent.Create(request);

            var resp = await _http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();

            using var doc = await JsonDocument.ParseAsync(await resp.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            var text = doc.RootElement
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString() ?? "";

            return text.Trim();
        }
    }
}
