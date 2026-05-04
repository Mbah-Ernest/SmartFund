using Anthropic.SDK;
using Anthropic.SDK.Messaging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartFund.Application.Interfaces.Stocks;
using SmartFund.Application.Services.Stocks;
using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Infrastructure.Stocks
{
    public sealed class AiBriefOrchestrator : IAiBriefOrchestrator
    {
        private readonly IPriceRepository _prices;
        private readonly IStockRepository _stocks;
        private readonly IAiBriefRepository _briefs;
        private readonly TechnicalIndicatorService _indicators;
        private readonly IConfiguration _config;
        private readonly ILogger<AiBriefOrchestrator> _logger;

        private const string SystemPrompt =
            "You are a decision-support assistant analysing stocks on the Nigerian Stock Exchange.\n" +
            "You produce concise, factual briefs based on technical indicators and news headlines provided to you.\n" +
            "You NEVER tell the user to buy or sell. You describe what the signals show and explicitly flag any conflicting signals.\n" +
            "You respect that the user is making their own decision and that markets are uncertain.\n" +
            "Keep briefs to 3-4 sentences. Use plain English. State the technical posture, the news sentiment if available, and any conflicts.";

        public AiBriefOrchestrator(
            IPriceRepository prices,
            IStockRepository stocks,
            IAiBriefRepository briefs,
            TechnicalIndicatorService indicators,
            IConfiguration config,
            ILogger<AiBriefOrchestrator> logger)
        {
            _prices = prices;
            _stocks = stocks;
            _briefs = briefs;
            _indicators = indicators;
            _config = config;
            _logger = logger;
        }

        public async Task GenerateBriefAsync(string ticker, CancellationToken ct = default)
        {
            var apiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("ANTHROPIC_API_KEY is not set. Skipping AI brief generation for {Ticker}.", ticker);
                return;
            }

            var stock = await _stocks.GetByTickerAsync(ticker, ct);
            if (stock is null)
            {
                _logger.LogWarning("Stock {Ticker} not found. Skipping brief generation.", ticker);
                return;
            }

            var priceEntries = await _prices.GetByTickerAsync(ticker, 60, ct);
            if (priceEntries.Count < 2)
            {
                _logger.LogInformation("Insufficient price data for {Ticker}. Need at least 2 entries.", ticker);
                return;
            }

            var candles = TechnicalIndicatorService.ToCandleList(priceEntries);
            var summary = _indicators.Analyse(candles);

            var latestEntry = priceEntries.OrderByDescending(p => p.TradeDate).First();
            var latestDate = latestEntry.TradeDate.ToString("yyyy-MM-dd");
            var latestClose = latestEntry.Close;

            var model = _config["Anthropic:Model"] ?? "claude-sonnet-4-6";
            var maxTokens = int.TryParse(_config["Anthropic:MaxTokens"], out var mt) ? mt : 600;

            var userPrompt = BuildUserPrompt(ticker, stock.CompanyName, latestClose, latestDate, summary);

            try
            {
                var client = new AnthropicClient(apiKey);
                var messages = new List<Message>
                {
                    new Message(RoleType.User, userPrompt)
                };

                var parameters = new MessageParameters
                {
                    Model = model,
                    MaxTokens = maxTokens,
                    Stream = false,
                    System = new List<SystemMessage> { new SystemMessage(SystemPrompt) },
                    Messages = messages
                };

                var response = await client.Messages.GetClaudeMessageAsync(parameters, ct);
                var briefText = response.Message.ToString();

                if (string.IsNullOrWhiteSpace(briefText))
                {
                    _logger.LogWarning("Claude returned empty brief for {Ticker}.", ticker);
                    return;
                }

                var brief = AiBrief.Create(
                    ticker,
                    summary.RsiValue,
                    summary.RsiSignal,
                    summary.MacdSignal,
                    summary.PriceVsSma20,
                    summary.PriceVsSma50,
                    null,
                    briefText.Trim());

                await _briefs.AddAsync(brief, ct);
                await _briefs.SaveChangesAsync(ct);

                _logger.LogInformation("AI brief generated for {Ticker} at {Time}.", ticker, brief.GeneratedAtUtc);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating AI brief for {Ticker}.", ticker);
                throw;
            }
        }

        private static string BuildUserPrompt(
            string ticker,
            string companyName,
            decimal latestClose,
            string latestDate,
            TechnicalSummary summary)
        {
            var macdHistogram = summary.MacdHistogram != 0
                ? summary.MacdHistogram.ToString("F4")
                : "N/A";

            return $"""
Stock: {ticker} ({companyName})
Latest close: ₦{latestClose:N2} on {latestDate}

Technical indicators (last 60 trading days):
- RSI(14): {(summary.RsiValue.HasValue ? summary.RsiValue.Value.ToString("F2") : "N/A")} → {summary.RsiSignal}
- Price vs SMA20: {summary.PriceVsSma20}
- Price vs SMA50: {summary.PriceVsSma50}
- MACD: {summary.MacdSignal} (histogram: {macdHistogram})

Recent news headlines:
None available

Write the decision-support brief.
""";
        }
    }
}
