using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using SmartFund.Application.Services.Agent;
using SmartFund.Application.UseCases.PersonalFinance;

namespace SmartFund.API.Services
{
    // ── Public shapes ──────────────────────────────────────────────────────────

    public sealed record ChatTurn(string Role, string Content);

    public sealed record ToolTrace(
        string ToolName,
        string InputJson,
        string OutputJson,
        long DurationMs);

    public sealed record AgentChatResponse(
        string Reply,
        List<ToolTrace> ToolTraces,
        PendingActionSummary? PendingAction);

    // ── Groq REST types (Chat Completions) ─────────────────────────────────────

    internal sealed class GroqChatCompletionRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = "";

        [JsonPropertyName("messages")]
        public List<GroqMessage> Messages { get; set; } = new();

        [JsonPropertyName("tools")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GroqTool>? Tools { get; set; }

        [JsonPropertyName("tool_choice")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ToolChoice { get; set; }

        [JsonPropertyName("max_tokens")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public int MaxTokens { get; set; }

        [JsonPropertyName("temperature")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        public double Temperature { get; set; }
    }

    internal sealed class GroqMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = "";

        [JsonPropertyName("content")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Content { get; set; }

        [JsonPropertyName("tool_calls")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<GroqToolCall>? ToolCalls { get; set; }

        [JsonPropertyName("tool_call_id")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ToolCallId { get; set; }
    }

    internal sealed class GroqTool
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "function";

        [JsonPropertyName("function")]
        public GroqToolFunction Function { get; set; } = new();
    }

    internal sealed class GroqToolFunction
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("description")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Description { get; set; }

        [JsonPropertyName("parameters")]
        public JsonElement Parameters { get; set; }
    }

    internal sealed class GroqResponse
    {
        [JsonPropertyName("choices")]
        public List<GroqChoice> Choices { get; set; } = new();
    }

    internal sealed class GroqChoice
    {
        [JsonPropertyName("message")]
        public GroqMessage? Message { get; set; }

        [JsonPropertyName("finish_reason")]
        public string? FinishReason { get; set; }
    }

    internal sealed class GroqToolCall
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = "";

        [JsonPropertyName("type")]
        public string Type { get; set; } = "function";

        [JsonPropertyName("function")]
        public GroqToolCallFunction Function { get; set; } = new();
    }

    internal sealed class GroqToolCallFunction
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("arguments")]
        public string Arguments { get; set; } = "";
    }

    // ── Service ───────────────────────────────────────────────────────────────

    public sealed class AgentChatService
    {
        private readonly HttpClient _http;
        private readonly AgentQueryService _query;
        private readonly AgentActionService _action;
        private readonly GetGoalInsights _goalInsights;
        private readonly string _apiKey;
        private readonly string _model;
        private readonly string _baseUrl;

        private const int DefaultMaxRetryAttempts = 4;
        private static readonly TimeSpan DefaultBaseRetryDelay = TimeSpan.FromSeconds(1);

        private static readonly JsonSerializerOptions _serializeOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        public AgentChatService(HttpClient http, AgentQueryService query, AgentActionService action,
            GetGoalInsights goalInsights, string apiKey, string model, string? baseUrl = null)
        {
            _http = http;
            _query = query;
            _action = action;
            _goalInsights = goalInsights;
            _apiKey = apiKey;
            _model = model;
            _baseUrl = string.IsNullOrWhiteSpace(baseUrl)
                ? "https://api.groq.com/openai/v1"
                : baseUrl.TrimEnd('/');
        }

        public async Task<AgentChatResponse> ChatAsync(
            string userId,
            List<ChatTurn> messages,
            CancellationToken ct)
        {
            var utcNow = DateTime.UtcNow;
            var traces = new List<ToolTrace>();
            PendingActionSummary? pendingAction = null;

            var lastUserText = messages.LastOrDefault(m => m.Role == "user")?.Content ?? "";
            var enableTools = ShouldEnableTools(lastUserText);

            var groqMessages = new List<GroqMessage>
            {
                new() { Role = "system", Content = BuildSystemPrompt(utcNow) }
            };

            foreach (var m in messages)
            {
                var role = m.Role == "assistant" ? "assistant" : "user";
                groqMessages.Add(new GroqMessage { Role = role, Content = m.Content });
            }

            const int maxIterations = 10;
            var iteration = 0;

            while (iteration++ < maxIterations)
            {
                var request = new GroqChatCompletionRequest
                {
                    Model = _model,
                    Messages = groqMessages,
                    Tools = enableTools ? ToolDeclarations : null,
                    ToolChoice = enableTools ? "auto" : null,
                    MaxTokens = 2048,
                    Temperature = 0.2
                };

                using var httpResp = await PostWithRetryAsync(request, ct);
                if (!httpResp.IsSuccessStatusCode)
                {
                    var status = (int)httpResp.StatusCode;
                    var body = await httpResp.Content.ReadAsStringAsync(ct);
                    if (body.Length > 4000)
                        body = body[..4000] + "...";

                    var providerMessage = TryExtractProviderErrorMessage(body);
                    var hint = status == 401 || status == 403
                        ? "Check Groq API key and permissions."
                        : status == 404
                            ? "Check Groq model name."
                            : status == 429
                                ? "Rate limit exceeded. Reduce request frequency or increase quota."
                                : "Check Groq configuration and provider status.";

                    var detail = string.IsNullOrWhiteSpace(providerMessage) ? body : providerMessage;
                    if (!string.IsNullOrWhiteSpace(detail))
                        detail = $" Details: {detail}";

                    return new AgentChatResponse(
                        $"AI provider call failed (HTTP {status}). {hint}{detail}",
                        traces,
                        pendingAction);
                }

                var groqResp = await httpResp.Content.ReadFromJsonAsync<GroqResponse>(cancellationToken: ct);
                if (groqResp?.Choices is null || groqResp.Choices.Count == 0)
                    return new AgentChatResponse("No response received from AI model.", traces, pendingAction);

                var msg = groqResp.Choices[0].Message;
                if (msg is null)
                    return new AgentChatResponse("No content in AI model response.", traces, pendingAction);

                var toolCalls = msg.ToolCalls ?? new List<GroqToolCall>();
                if (toolCalls.Count == 0)
                {
                    return new AgentChatResponse(msg.Content ?? "", traces, pendingAction);
                }

                // Append assistant tool call message
                groqMessages.Add(msg);

                foreach (var tc in toolCalls)
                {
                    var sw = Stopwatch.StartNew();
                    var toolName = tc.Function?.Name ?? "";
                    var argsJson = tc.Function?.Arguments ?? "{}";

                    string resultJson;
                    try
                    {
                        using var argsDoc = JsonDocument.Parse(string.IsNullOrWhiteSpace(argsJson) ? "{}" : argsJson);
                        var result = await DispatchToolAsync(userId, toolName, argsDoc.RootElement, ct);
                        resultJson = result.resultJson;
                        if (result.pendingAction is not null)
                            pendingAction = result.pendingAction;
                    }
                    catch (Exception ex)
                    {
                        resultJson = JsonSerializer.Serialize(new { error = ex.Message });
                    }
                    sw.Stop();

                    traces.Add(new ToolTrace(toolName, argsJson, resultJson, sw.ElapsedMilliseconds));

                    // tool role message must reference tool_call_id
                    groqMessages.Add(new GroqMessage
                    {
                        Role = "tool",
                        ToolCallId = tc.Id,
                        Content = resultJson
                    });
                }
            }

            return new AgentChatResponse(
                "I've reached my processing limit for this request. Please try a more specific question.",
                traces, pendingAction);
        }

        private static bool ShouldEnableTools(string userText)
        {
            if (string.IsNullOrWhiteSpace(userText))
                return false;

            var t = new string(userText.Where(c => !char.IsPunctuation(c)).ToArray()).Trim().ToLowerInvariant();

            // Suppress only for pure greetings/small-talk — let the LLM decide everything else.
            if (t is "hi" or "hello" or "hey" or "yo" or "sup" or "good morning" or "good afternoon" or "good evening")
                return false;
            if (t.StartsWith("hi ") || t.StartsWith("hello ") || t.StartsWith("hey "))
                return false;

            return true;
        }

        // ── Tool input helpers ─────────────────────────────────────────────────

        private static string GetStr(JsonElement args, string key) =>
            args.GetProperty(key).GetString()!;

        private static int GetInt(JsonElement args, string key) =>
            args.GetProperty(key).GetInt32();

        private static long GetLong(JsonElement args, string key) =>
            args.GetProperty(key).GetInt64();

        private static decimal GetDecimal(JsonElement args, string key)
        {
            var el = args.GetProperty(key);
            return el.ValueKind == JsonValueKind.Number ? el.GetDecimal() : decimal.Parse(el.GetString()!);
        }

        private static bool TryGetInt(JsonElement args, string key, out int value)
        {
            if (!args.TryGetProperty(key, out var el))
            {
                value = 0;
                return false;
            }

            if (el.ValueKind == JsonValueKind.Number)
            {
                value = el.GetInt32();
                return true;
            }

            if (el.ValueKind == JsonValueKind.String && int.TryParse(el.GetString(), out value))
                return true;

            value = 0;
            return false;
        }

        private static bool TryGetLong(JsonElement args, string key, out long value)
        {
            if (args.TryGetProperty(key, out var el) && el.ValueKind == JsonValueKind.Number)
            { value = el.GetInt64(); return true; }
            value = 0; return false;
        }

        private static bool TryGetStr(JsonElement args, string key, out string? value)
        {
            if (args.TryGetProperty(key, out var el) && el.ValueKind == JsonValueKind.String)
            { value = el.GetString(); return true; }
            value = null; return false;
        }

        // ── Tool dispatch ──────────────────────────────────────────────────────

        private async Task<(string resultJson, PendingActionSummary? pendingAction)> DispatchToolAsync(
            string userId, string toolName, JsonElement args, CancellationToken ct)
        {
            var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
            switch (toolName)
            {
                case "get_wallet_balances":
                {
                    var r = await _query.GetWalletBalancesAsync(longUserId, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_spending_summary":
                {
                    var from = DateTime.Parse(GetStr(args, "fromDate"));
                    var to = DateTime.Parse(GetStr(args, "toDate"));
                    long[]? catIds = null;
                    if (args.TryGetProperty("categoryIds", out var catProp) && catProp.ValueKind == JsonValueKind.Array)
                    {
                        var ids = new List<long>();
                        foreach (var el in catProp.EnumerateArray()) ids.Add(el.GetInt64());
                        catIds = ids.ToArray();
                    }
                    var r = await _query.GetSpendingSummaryAsync(longUserId, from, to, catIds, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_cash_flow":
                {
                    var r = await _query.GetCashFlowAsync(longUserId, GetInt(args, "months"), ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_goal_progress":
                {
                    long? goalId = TryGetLong(args, "goalId", out var gid) ? gid : null;
                    var r = await _query.GetGoalProgressAsync(longUserId, goalId, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_budget_health":
                {
                    var r = await _query.GetBudgetHealthAsync(longUserId, GetInt(args, "year"), GetInt(args, "month"), ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_recent_transactions":
                {
                    var take = TryGetInt(args, "take", out var t) ? t : 20;
                    var r = await _query.GetRecentTransactionsAsync(longUserId, take, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_cash_runway":
                {
                    var r = await _query.GetCashRunwayAsync(longUserId, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "draft_budget_suggestion":
                {
                    var lb = TryGetInt(args, "lookbackMonths", out var l) ? l : 3;
                    var r = await _query.SuggestBudgetsAsync(longUserId, lb, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "suggest_spending_cuts":
                {
                    var r = await _query.SuggestCutsAsync(longUserId, GetDecimal(args, "targetReductionNaira"), ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "initiate_transfer":
                {
                    TryGetStr(args, "description", out var desc);
                    var pending = await _action.InitiateTransferAsync(
                        userId,
                        GetLong(args, "fromWalletId"),
                        GetLong(args, "toWalletId"),
                        GetDecimal(args, "amountNaira"),
                        desc, ct);
                    return (JsonSerializer.Serialize(pending), pending);
                }
                case "create_budget":
                {
                    var pending = await _action.InitiateCreateBudgetAsync(
                        userId,
                        GetLong(args, "categoryId"),
                        GetDecimal(args, "amountNaira"),
                        GetStr(args, "period"),
                        ct);
                    return (JsonSerializer.Serialize(pending), pending);
                }
                case "get_top_categories":
                {
                    var from = DateTime.Parse(GetStr(args, "fromDate"));
                    var to = DateTime.Parse(GetStr(args, "toDate"));
                    var limit = TryGetInt(args, "limit", out var lim) ? lim : 5;
                    TryGetStr(args, "type", out var typFilter);
                    var r = await _query.GetTopCategoriesAsync(longUserId, from, to, limit, typFilter, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_income_sources":
                {
                    var from = DateTime.Parse(GetStr(args, "fromDate"));
                    var to = DateTime.Parse(GetStr(args, "toDate"));
                    var r = await _query.GetIncomeSourcesAsync(longUserId, from, to, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_category_trend":
                {
                    var catName = GetStr(args, "categoryName");
                    var months = TryGetInt(args, "months", out var m) ? m : 6;
                    var r = await _query.GetCategoryTrendAsync(longUserId, catName, months, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_net_worth":
                {
                    var r = await _query.GetNetWorthAsync(longUserId, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_savings_rate":
                {
                    var months = TryGetInt(args, "months", out var m) ? m : 3;
                    var r = await _query.GetSavingsRateAsync(longUserId, months, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_mtd_summary":
                {
                    var r = await _query.GetMtdSummaryAsync(longUserId, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_spending_by_period":
                {
                    var from = DateTime.Parse(GetStr(args, "fromDate"));
                    var to = DateTime.Parse(GetStr(args, "toDate"));
                    var groupBy = TryGetStr(args, "groupBy", out var gb) ? gb ?? "day" : "day";
                    var r = await _query.GetSpendingByPeriodAsync(longUserId, from, to, groupBy, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_goal_save_up_plan":
                {
                    long? gid = TryGetLong(args, "goalId", out var goalId) ? goalId : null;
                    var r = await _query.GetGoalSavePlanAsync(longUserId, gid, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_wallet_transactions":
                {
                    var walletId = GetLong(args, "walletId");
                    DateTime? from = TryGetStr(args, "fromDate", out var fd) && fd != null ? DateTime.Parse(fd) : null;
                    DateTime? to = TryGetStr(args, "toDate", out var td) && td != null ? DateTime.Parse(td) : null;
                    var take = TryGetInt(args, "take", out var tk) ? tk : 30;
                    var r = await _query.GetWalletTransactionsAsync(longUserId, walletId, from, to, take, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_recurring_patterns":
                {
                    var months = TryGetInt(args, "lookbackMonths", out var m) ? m : 3;
                    var r = await _query.GetRecurringPatternsAsync(longUserId, months, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "log_expense":
                {
                    TryGetStr(args, "description", out var desc);
                    var date = TryGetStr(args, "date", out var ds) && ds != null
                        ? DateTime.Parse(ds) : DateTime.UtcNow;
                    var pending = await _action.InitiateLogExpenseAsync(
                        userId,
                        GetDecimal(args, "amountNaira"),
                        GetLong(args, "categoryId"),
                        GetLong(args, "walletId"),
                        desc, date, ct);
                    return (JsonSerializer.Serialize(pending), pending);
                }
                case "log_income":
                {
                    TryGetStr(args, "description", out var desc);
                    var date = TryGetStr(args, "date", out var ds) && ds != null
                        ? DateTime.Parse(ds) : DateTime.UtcNow;
                    var pending = await _action.InitiateLogIncomeAsync(
                        userId,
                        GetDecimal(args, "amountNaira"),
                        GetLong(args, "categoryId"),
                        GetLong(args, "walletId"),
                        desc, date, ct);
                    return (JsonSerializer.Serialize(pending), pending);
                }
                case "update_budget":
                {
                    var pending = await _action.InitiateUpdateBudgetAsync(
                        userId,
                        GetLong(args, "budgetId"),
                        GetDecimal(args, "newAmountNaira"),
                        ct);
                    return (JsonSerializer.Serialize(pending), pending);
                }
                case "update_goal_target":
                {
                    DateTime? newDeadline = TryGetStr(args, "newDeadline", out var nd) && nd != null
                        ? DateTime.Parse(nd) : null;
                    var pending = await _action.InitiateUpdateGoalTargetAsync(
                        userId,
                        GetLong(args, "goalId"),
                        GetDecimal(args, "newTargetNaira"),
                        newDeadline, ct);
                    return (JsonSerializer.Serialize(pending), pending);
                }
                case "get_debt_overview":
                {
                    var r = await _query.GetDebtOverviewAsync(longUserId, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_debt_list":
                {
                    TryGetStr(args, "status", out var status);
                    var r = await _query.GetDebtListAsync(longUserId, status, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_debt_insights":
                {
                    var r = await _query.GetDebtInsightsAsync(longUserId, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "get_debt_payment_history":
                {
                    var r = await _query.GetDebtPaymentHistoryAsync(longUserId, GetLong(args, "debtId"), ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "record_debt_payment":
                {
                    var paidOn = TryGetStr(args, "paidOn", out var po) && po != null
                        ? DateTime.Parse(po) : DateTime.UtcNow;
                    TryGetStr(args, "note", out var note);
                    var pending = await _action.InitiateRecordDebtPaymentAsync(
                        userId,
                        GetLong(args, "debtId"),
                        GetDecimal(args, "amountNaira"),
                        note, paidOn, ct);
                    return (JsonSerializer.Serialize(pending), pending);
                }
                case "create_debt":
                {
                    TryGetStr(args, "description", out var desc);
                    var pending = await _action.InitiateCreateDebtAsync(
                        userId,
                        GetStr(args, "creditorName"),
                        GetDecimal(args, "principalAmount"),
                        GetDecimal(args, "totalAmountDue"),
                        DateTime.Parse(GetStr(args, "dueDate")),
                        desc, ct);
                    return (JsonSerializer.Serialize(pending), pending);
                }
                case "get_goal_insights":
                {
                    var r = await _goalInsights.ExecuteAsync(longUserId, ct);
                    return (JsonSerializer.Serialize(r), null);
                }
                case "contribute_to_goal":
                {
                    long? fromWalletId = TryGetLong(args, "fromWalletId", out var fw) ? fw : null;
                    var pending = await _action.InitiateContributeToGoalAsync(
                        userId,
                        GetLong(args, "goalId"),
                        GetDecimal(args, "amountNaira"),
                        fromWalletId,
                        ct);
                    return (JsonSerializer.Serialize(pending), pending);
                }
                default:
                    return (JsonSerializer.Serialize(new { error = $"Unknown tool: {toolName}" }), null);
            }
        }

        private async Task<HttpResponseMessage> PostWithRetryAsync(GroqChatCompletionRequest request, CancellationToken ct)
        {
            for (var attempt = 0; ; attempt++)
            {
                using var httpReq = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/chat/completions")
                {
                    Content = JsonContent.Create(request, options: _serializeOptions)
                };

                httpReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

                HttpResponseMessage httpResp;
                try
                {
                    httpResp = await _http.SendAsync(httpReq, ct);
                }
                catch (HttpRequestException ex) when (ex.InnerException is System.Net.Sockets.SocketException sock)
                {
                    if (sock.SocketErrorCode == System.Net.Sockets.SocketError.HostNotFound)
                        throw new InvalidOperationException(
                            $"Network/DNS error: cannot resolve host for Groq endpoint '{_baseUrl}'. " +
                            "Check your internet connection, DNS settings, or proxy/VPN configuration. " +
                            "If you need to use a different endpoint, set GROQ_BASE_URL (or Groq:BaseUrl).",
                            ex);

                    throw;
                }
                if (!ShouldRetry(httpResp) || attempt >= DefaultMaxRetryAttempts)
                    return httpResp;

                var delay = GetRetryDelay(httpResp, attempt);
                httpResp.Dispose();
                await Task.Delay(delay, ct);
            }
        }

        private static bool ShouldRetry(HttpResponseMessage resp)
        {
            var code = (int)resp.StatusCode;
            return code == 429 || code == 500 || code == 502 || code == 503 || code == 504;
        }

        private static TimeSpan GetRetryDelay(HttpResponseMessage resp, int attempt)
        {
            if (resp.Headers.RetryAfter?.Delta is TimeSpan delta)
            {
                if (delta < TimeSpan.Zero) return DefaultBaseRetryDelay;
                return delta;
            }

            var multiplier = Math.Pow(2, attempt);
            var seconds = DefaultBaseRetryDelay.TotalSeconds * multiplier;
            seconds = Math.Min(seconds, 30);
            return TimeSpan.FromSeconds(seconds);
        }

        private static string? TryExtractProviderErrorMessage(string body)
        {
            if (string.IsNullOrWhiteSpace(body))
                return null;

            try
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("error", out var err))
                {
                    if (err.TryGetProperty("message", out var msg) && msg.ValueKind == JsonValueKind.String)
                        return msg.GetString();
                }
            }
            catch
            {
                // ignore parse errors
            }

            return null;
        }

        // ── Tool declarations (OpenAI/Groq schema format) ──────────────────────

        private static readonly List<GroqTool> ToolDeclarations = BuildToolDeclarations();

        private static List<GroqTool> BuildToolDeclarations()
        {
            static JsonElement P(object schema) => JsonSerializer.SerializeToElement(schema);

            return new List<GroqTool>
            {
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_wallet_balances",
                        Description = "Returns balances for all personal wallets, including connected bank accounts.",
                        Parameters = P(new { type = "object", properties = new { } })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_spending_summary",
                        Description = "Returns total spending grouped by category for a given date range.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                fromDate = new { type = "string", description = "Start date in YYYY-MM-DD format" },
                                toDate   = new { type = "string", description = "End date in YYYY-MM-DD format" },
                                categoryIds = new { type = "array", items = new { type = "integer" }, description = "Optional category IDs to filter by" }
                            },
                            required = new[] { "fromDate", "toDate" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_cash_flow",
                        Description = "Returns monthly income vs expense cash flow for the last N months.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                months = new { type = "integer", description = "Number of past months to include (1-24)" }
                            },
                            required = new[] { "months" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_goal_progress",
                        Description = "Returns progress toward savings goals: target, saved, deadline, % complete, months remaining.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                goalId = new { type = "integer", description = "Specific goal ID, or omit for all goals" }
                            }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_budget_health",
                        Description = "Returns budget vs actual spending per category for the given month.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                year  = new { type = "integer", description = "Year e.g. 2025" },
                                month = new { type = "integer", description = "Month number 1-12" }
                            },
                            required = new[] { "year", "month" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_recent_transactions",
                        Description = "Returns the most recent transactions with category and wallet labels.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                take = new { type = "integer", description = "Number of transactions to return (default 20)" }
                            }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_cash_runway",
                        Description = "Returns how many months current balances would last at the 3-month average spend rate.",
                        Parameters = P(new { type = "object", properties = new { } })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "draft_budget_suggestion",
                        Description = "Suggests budget amounts per expense category based on recent spending history.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                lookbackMonths = new { type = "integer", description = "Months of history to use (default 3)" }
                            }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "suggest_spending_cuts",
                        Description = "Suggests how to reduce monthly spending to hit a target savings amount.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                targetReductionNaira = new { type = "number", description = "Monthly amount to cut in Naira" }
                            },
                            required = new[] { "targetReductionNaira" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "initiate_transfer",
                        Description = "Proposes a fund transfer between two wallets. Returns a pendingActionId — the user must confirm before money moves.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                fromWalletId = new { type = "integer", description = "Source wallet ID" },
                                toWalletId   = new { type = "integer", description = "Destination wallet ID" },
                                amountNaira  = new { type = "number",  description = "Amount in Naira" },
                                description  = new { type = "string",  description = "Optional note" }
                            },
                            required = new[] { "fromWalletId", "toWalletId", "amountNaira" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "create_budget",
                        Description = "Proposes creating a new budget for a category. Returns a pendingActionId — the user must confirm before it is saved.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                categoryId  = new { type = "integer", description = "Category ID" },
                                amountNaira = new { type = "number",  description = "Budget amount in Naira" },
                                period      = new { type = "string",  description = "Budget period: Monthly or Weekly" }
                            },
                            required = new[] { "categoryId", "amountNaira", "period" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_top_categories",
                        Description = "Returns the top spending/income categories ranked by total, with % of total and transaction count.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                fromDate = new { type = "string", description = "Start date YYYY-MM-DD" },
                                toDate   = new { type = "string", description = "End date YYYY-MM-DD" },
                                limit    = new {
                                    anyOf = new object[] {
                                        new { type = "integer" },
                                        new { type = "string", pattern = "^[0-9]+$" }
                                    },
                                    description = "Max categories to return (default 5)"
                                },
                                type     = new { type = "string", description = "Filter by type: Income or Expense (optional)" }
                            },
                            required = new[] { "fromDate", "toDate" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_income_sources",
                        Description = "Returns income grouped by category with % share of total income for a date range.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                fromDate = new { type = "string", description = "Start date YYYY-MM-DD" },
                                toDate   = new { type = "string", description = "End date YYYY-MM-DD" }
                            },
                            required = new[] { "fromDate", "toDate" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_category_trend",
                        Description = "Returns month-by-month spending totals for a named category over the last N months.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                categoryName = new { type = "string", description = "Category name (case-insensitive substring match)" },
                                months       = new { type = "integer", description = "Number of past months (default 6)" }
                            },
                            required = new[] { "categoryName" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_net_worth",
                        Description = "Returns the sum of all wallet balances (total net worth) broken down per wallet.",
                        Parameters = P(new { type = "object", properties = new { } })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_savings_rate",
                        Description = "Returns month-by-month savings rate (income minus expenses / income) plus an average across the period.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                months = new { type = "integer", description = "Number of past months (default 3)" }
                            }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_mtd_summary",
                        Description = "Returns current month-to-date income, expenses, and net vs the previous full month, with % change.",
                        Parameters = P(new { type = "object", properties = new { } })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_spending_by_period",
                        Description = "Returns spending totals grouped by day, week, or month for a date range.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                fromDate = new { type = "string", description = "Start date YYYY-MM-DD" },
                                toDate   = new { type = "string", description = "End date YYYY-MM-DD" },
                                groupBy  = new { type = "string", description = "day | week | month (default day)" }
                            },
                            required = new[] { "fromDate", "toDate" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_goal_save_up_plan",
                        Description = "For each active goal, calculates the required monthly savings to hit the target by the deadline.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                goalId = new { type = "integer", description = "Specific goal ID, or omit for all goals" }
                            }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_goal_insights",
                        Description = "Returns aggregate goal analytics: total target, total saved, goals on track, overdue goals, overall progress %, next deadline goal, and per-goal breakdown with monthly required savings and estimated completion dates.",
                        Parameters = P(new { type = "object", properties = new { } })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "contribute_to_goal",
                        Description = "Proposes contributing to a savings goal. For wallet-linked goals, initiates a wallet transfer. For manual goals, directly adds to the saved amount. Returns a pendingActionId — the user must confirm.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                goalId      = new { type = "integer", description = "Goal ID" },
                                amountNaira = new { type = "number",  description = "Amount to contribute in Naira" },
                                fromWalletId = new { type = "integer", description = "Source wallet ID (required for wallet-linked goals)" }
                            },
                            required = new[] { "goalId", "amountNaira" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_wallet_transactions",
                        Description = "Returns transactions for a specific wallet, newest first, with optional date filter.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                walletId = new { type = "integer", description = "Wallet ID" },
                                fromDate = new { type = "string", description = "Optional start date YYYY-MM-DD" },
                                toDate   = new { type = "string", description = "Optional end date YYYY-MM-DD" },
                                take     = new { type = "integer", description = "Max transactions to return (default 30)" }
                            },
                            required = new[] { "walletId" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_recurring_patterns",
                        Description = "Detects recurring transactions (same description in 2+ months) and returns their frequency, average amount, and category.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                lookbackMonths = new { type = "integer", description = "Months of history to scan (default 3)" }
                            }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "log_expense",
                        Description = "Proposes logging an expense transaction. Returns a pendingActionId — the user must confirm before it is saved.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                amountNaira = new { type = "number",  description = "Amount in Naira" },
                                categoryId  = new { type = "integer", description = "Category ID" },
                                walletId    = new { type = "integer", description = "Wallet ID to debit" },
                                description = new { type = "string",  description = "Optional note" },
                                date        = new { type = "string",  description = "Optional date YYYY-MM-DD (default today)" }
                            },
                            required = new[] { "amountNaira", "categoryId", "walletId" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "log_income",
                        Description = "Proposes logging an income transaction. Returns a pendingActionId — the user must confirm before it is saved.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                amountNaira = new { type = "number",  description = "Amount in Naira" },
                                categoryId  = new { type = "integer", description = "Category ID" },
                                walletId    = new { type = "integer", description = "Wallet ID to credit" },
                                description = new { type = "string",  description = "Optional note" },
                                date        = new { type = "string",  description = "Optional date YYYY-MM-DD (default today)" }
                            },
                            required = new[] { "amountNaira", "categoryId", "walletId" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "update_budget",
                        Description = "Proposes updating the amount of an existing budget. Returns a pendingActionId — the user must confirm before it is saved.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                budgetId       = new { type = "integer", description = "Budget ID to update" },
                                newAmountNaira = new { type = "number",  description = "New budget amount in Naira" }
                            },
                            required = new[] { "budgetId", "newAmountNaira" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "update_goal_target",
                        Description = "Proposes updating a savings goal's target amount and/or deadline. Returns a pendingActionId — the user must confirm.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                goalId         = new { type = "integer", description = "Goal ID to update" },
                                newTargetNaira = new { type = "number",  description = "New target amount in Naira" },
                                newDeadline    = new { type = "string",  description = "Optional new deadline YYYY-MM-DD" }
                            },
                            required = new[] { "goalId", "newTargetNaira" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_debt_overview",
                        Description = "Returns aggregate debt figures: total count, active/overdue counts, total owed, paid, remaining, total interest, and earliest due date.",
                        Parameters = P(new { type = "object", properties = new { } })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_debt_list",
                        Description = "Returns individual debts with urgency badges (Overdue/Critical/Soon/Upcoming/Future), sorted by due date. Optionally filter by status (Active, PaidOff, Forgiven).",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                status = new { type = "string", description = "Optional filter: Active | PaidOff | Forgiven" }
                            }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_debt_insights",
                        Description = "Returns repayment projections, debt-free date estimate, monthly debt burden as % of income, and urgency ranking. Use for 'When will I be debt-free?' or 'How much of my income goes to debt?'",
                        Parameters = P(new { type = "object", properties = new { } })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "get_debt_payment_history",
                        Description = "Returns the payment history for a specific debt.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                debtId = new { type = "integer", description = "Debt ID" }
                            },
                            required = new[] { "debtId" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "record_debt_payment",
                        Description = "Proposes recording a payment against a debt. Returns a pendingActionId — the user must confirm before it is saved.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                debtId      = new { type = "integer", description = "Debt ID" },
                                amountNaira = new { type = "number",  description = "Payment amount in Naira" },
                                note        = new { type = "string",  description = "Optional note" },
                                paidOn      = new { type = "string",  description = "Optional payment date YYYY-MM-DD (default today)" }
                            },
                            required = new[] { "debtId", "amountNaira" }
                        })
                    }
                },
                new() {
                    Function = new GroqToolFunction {
                        Name = "create_debt",
                        Description = "Proposes tracking a new debt obligation. Returns a pendingActionId — the user must confirm before it is saved.",
                        Parameters = P(new {
                            type = "object",
                            properties = new {
                                creditorName    = new { type = "string",  description = "Name of the creditor (bank, person, institution)" },
                                principalAmount = new { type = "number",  description = "Original principal borrowed in Naira" },
                                totalAmountDue  = new { type = "number",  description = "Total repayment amount (principal + interest) in Naira" },
                                dueDate         = new { type = "string",  description = "Repayment deadline YYYY-MM-DD" },
                                description     = new { type = "string",  description = "Optional notes about the debt" }
                            },
                            required = new[] { "creditorName", "principalAmount", "totalAmountDue", "dueDate" }
                        })
                    }
                }
            };
        }

        // ── System prompt ──────────────────────────────────────────────────────

        private static string BuildSystemPrompt(DateTime utcNow) => $"""
            You are SmartFund Assistant — a personal finance decision coach for Nigerian users.
            Today is {utcNow:yyyy-MM-dd} UTC. The user's account is scoped to their authenticated identity; you cannot access any other user's data.

            HARD RULES:
            - Every financial figure must come from a tool call. Never estimate or invent numbers.
            - DO NOT call any tools for simple greetings, small talk, or general conversational questions like "what?", "who are you?", "how are you?". Just reply conversationally.
            - ONLY invoke tools if the user's specific request requires fetching or updating their personal financial data.
            - If a tool returns no data, say so explicitly and ask the user what they need.
            - For transfers or budget creation: use the initiate_* tool, present the pending summary, and wait for the user to confirm. Never claim an action completed until you receive the confirmation result.
            - Scope: Personal Finance only — wallets, transactions, goals, budgets, bank accounts. Do not comment on investment tranches, fund deals, or other users' data.

            DEBT AWARENESS:
            - Use get_debt_overview for any question about total debt, debt load, or net worth impact of debts.
            - Use get_debt_list to show individual debts with urgency rankings.
            - Use get_debt_insights for repayment projections and debt-free date estimates.
            - Always factor in active debt obligations when assessing affordability or cash runway.
            - Use record_debt_payment (with confirmation) when the user wants to log a payment.
            - Use create_debt (with confirmation) when the user wants to track a new debt.

            GOAL TRACKING:
            - Use get_goal_insights for any question about savings goals progress, on-track status, or aggregate goal health.
            - Use get_goal_progress for simple per-goal progress checks.
            - Use get_goal_save_up_plan when the user asks how much to save per month or when they'll hit a goal.
            - Use contribute_to_goal (with confirmation) when the user wants to add money to a goal. For wallet-linked goals, a fromWalletId is required.
            - Always check goal progress when answering affordability questions that could delay a goal timeline.

            AFFORDABILITY COACHING (for "Can I afford X?" questions):
            Follow this sequence before answering:
            1. Call get_wallet_balances — check if liquid funds cover the purchase outright.
            2. Call get_cash_runway — understand burn rate and financial cushion. If RunwayMonths < 3, flag as low buffer.
            3. Call get_debt_overview — check total active debt obligations. If there are overdue debts, flag them before approving any discretionary spend.
            4. Call get_goal_progress — check every active goal. Flag any where the purchase would delay the deadline or reduce ProgressPct significantly.
            5. Call get_budget_health for the current month — see if the purchase fits within available budget headroom.
            6. Optionally call get_spending_summary for the last 30 days — to add context on recent patterns.

            Then synthesize a verdict:
            - YES (comfortable): funds cover it, runway stays healthy (≥3 months), no goal materially delayed.
            - YES (with caution): affordable now but cite the specific risk (runway drops, goal slips by N months, budget blown).
            - NO: explain the shortfall, suggest a save-up timeline based on surplus income from get_cash_flow.
            Always state the post-purchase runway so the user sees the real impact.

            TOOL ROUTING GUIDE:
            - "How am I doing this month?" → call get_mtd_summary first; optionally follow with get_spending_by_period (groupBy="day") for a daily breakdown.
            - "Is my [X] spend going up?" → call get_category_trend with the category name and months=6.
            - "Where is my money coming from?" → call get_income_sources with the current month or last 30 days.
            - "What's my savings rate?" → call get_savings_rate with months=3.
            - "What are my recurring expenses/subscriptions?" → call get_recurring_patterns.
            - "When will I hit my goal?" / "How much should I save per month?" → call get_goal_save_up_plan.
            - "How are my savings goals doing?" / "Am I on track with my goals?" → call get_goal_insights.
            - "Contribute X to my [goal name]" / "Put money toward my goal" → use contribute_to_goal (with confirmation).
            - "What are my biggest expenses?" → call get_top_categories with type="Expense".
            - "What's my net worth?" → call get_net_worth.
            - Log/record/add expense or income → use log_expense or log_income. Always identify the category first from context or ask the user. Always confirm the wallet. Present the pending summary and wait for user confirmation.
            - Update a budget → use update_budget. Fetch current budget health first if context is missing. Show old vs new in summary before confirming.
            - Update a goal target or deadline → use update_goal_target. Fetch goal progress first if context is missing. Show what changes before confirming.
            - For action tools (log_expense, log_income, update_budget, update_goal_target, initiate_transfer, create_budget): never claim the action is done until you receive the confirmation result from the user.

            RESPONSE STYLE:
            - Lead with a direct verdict (YES / NO / CAUTION), then supporting data.
            - Use ₦ and comma-formatted numbers (₦600,000 not 600000).
            - Keep responses concise. Use bullet lists for comparisons; prose for coaching advice.
            - Show before/after runway when answering affordability questions.
            """;
    }
}
