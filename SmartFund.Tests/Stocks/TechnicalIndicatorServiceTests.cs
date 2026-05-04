using SmartFund.Application.Services.Stocks;
using Xunit;

namespace SmartFund.Tests.Stocks
{
    public sealed class TechnicalIndicatorServiceTests
    {
        private readonly TechnicalIndicatorService _sut = new();

        // ── SMA ─────────────────────────────────────────────────────────────────

        [Fact]
        public void Sma_ReturnsNull_WhenInsufficientData()
        {
            var closes = new List<decimal> { 1, 2, 3 };
            Assert.Null(_sut.Sma(closes, 5));
        }

        [Fact]
        public void Sma_ReturnsCorrectAverage()
        {
            var closes = new List<decimal> { 1, 2, 3, 4, 5 };
            var result = _sut.Sma(closes, 5);
            Assert.Equal(3.0m, result);
        }

        [Fact]
        public void Sma_UsesLastNValues()
        {
            var closes = new List<decimal> { 1, 2, 3, 4, 5, 6, 7 };
            var result = _sut.Sma(closes, 5);
            Assert.Equal(5.0m, result); // avg of [3,4,5,6,7]
        }

        // ── EMA ─────────────────────────────────────────────────────────────────

        [Fact]
        public void Ema_ReturnsNull_WhenInsufficientData()
        {
            var closes = new List<decimal> { 1, 2 };
            Assert.Null(_sut.Ema(closes, 5));
        }

        [Fact]
        public void Ema_WeightsRecentPricesMore()
        {
            // For an exponentially-growing series, EMA should exceed SMA because
            // recent prices are much higher and EMA weights them more heavily.
            var closes = Enumerable.Range(0, 10)
                .Select(i => Math.Round(100m * (decimal)Math.Pow(1.05, i), 4))
                .ToList();
            var ema = _sut.Ema(closes, 5);
            var sma = _sut.Sma(closes, 5);
            Assert.NotNull(ema);
            Assert.NotNull(sma);
            Assert.True(ema!.Value > sma!.Value,
                $"EMA ({ema.Value}) should be > SMA ({sma.Value}) for an accelerating series.");
        }

        // ── RSI ─────────────────────────────────────────────────────────────────

        [Fact]
        public void Rsi_ReturnsNull_WhenInsufficientData()
        {
            var closes = new List<decimal> { 44.34m, 44.09m, 44.15m };
            Assert.Null(_sut.Rsi(closes, 14));
        }

        [Fact]
        public void Rsi_Returns100_WhenAllGains()
        {
            var closes = Enumerable.Range(1, 20).Select(i => (decimal)i).ToList();
            var rsi = _sut.Rsi(closes, 14);
            Assert.NotNull(rsi);
            Assert.Equal(100m, rsi!.Value);
        }

        [Fact]
        public void Rsi_Returns0_WhenAllLosses()
        {
            var closes = Enumerable.Range(1, 20).Select(i => (decimal)(20 - i)).ToList();
            var rsi = _sut.Rsi(closes, 14);
            Assert.NotNull(rsi);
            Assert.Equal(0m, rsi!.Value);
        }

        [Fact]
        public void Rsi_IsBetween0And100()
        {
            // Mixed up/down series
            var rng = new Random(42);
            var closes = new List<decimal> { 100m };
            for (int i = 0; i < 30; i++)
                closes.Add(closes.Last() + (decimal)(rng.NextDouble() * 4 - 2));

            var rsi = _sut.Rsi(closes, 14);
            Assert.NotNull(rsi);
            Assert.True(rsi!.Value >= 0 && rsi.Value <= 100);
        }

        // ── MACD ────────────────────────────────────────────────────────────────

        [Fact]
        public void Macd_ReturnsNull_WhenInsufficientData()
        {
            var closes = Enumerable.Range(1, 20).Select(i => (decimal)i).ToList();
            Assert.Null(_sut.Macd(closes)); // need at least 26+9-1=34 data points
        }

        [Fact]
        public void Macd_ReturnsResult_WithSufficientData()
        {
            var closes = Enumerable.Range(1, 40).Select(i => (decimal)i).ToList();
            var result = _sut.Macd(closes);
            Assert.NotNull(result);
        }

        [Fact]
        public void Macd_HistogramIsLineMinusSignalLine()
        {
            var rng = new Random(99);
            var closes = new List<decimal> { 100m };
            for (int i = 0; i < 50; i++)
                closes.Add(closes.Last() + (decimal)(rng.NextDouble() * 6 - 3));

            var result = _sut.Macd(closes);
            Assert.NotNull(result);
            Assert.Equal(result!.Histogram, result.MacdLine - result.SignalLine, 3);
        }

        // ── Analyse ─────────────────────────────────────────────────────────────

        [Fact]
        public void Analyse_ReturnsInsufficientData_WhenEmpty()
        {
            var summary = _sut.Analyse(new List<StockCandle>());
            Assert.Equal("Insufficient data", summary.RsiSignal);
        }

        [Fact]
        public void Analyse_ClassifiesOversold_WhenRsiBelow30()
        {
            // Sustained downtrend generates oversold RSI
            var closes = new List<decimal> { 100m };
            for (int i = 0; i < 25; i++) closes.Add(closes.Last() * 0.96m);

            var candles = closes.Select((c, i) => new StockCandle
            {
                Date = DateTime.UtcNow.AddDays(-closes.Count + i),
                Open = c, High = c, Low = c, Close = c, Volume = 1000
            }).ToList();

            var summary = _sut.Analyse(candles);
            Assert.Equal("Oversold", summary.RsiSignal);
        }

        [Fact]
        public void Analyse_ClassifiesOverbought_WhenRsiAbove70()
        {
            // Sustained uptrend generates overbought RSI
            var closes = new List<decimal> { 100m };
            for (int i = 0; i < 25; i++) closes.Add(closes.Last() * 1.04m);

            var candles = closes.Select((c, i) => new StockCandle
            {
                Date = DateTime.UtcNow.AddDays(-closes.Count + i),
                Open = c, High = c, Low = c, Close = c, Volume = 1000
            }).ToList();

            var summary = _sut.Analyse(candles);
            Assert.Equal("Overbought", summary.RsiSignal);
        }

        // ── AI brief safety (decision-support constraint) ────────────────────────

        private static readonly string[] ForbiddenPhrases =
            ["buy now", "sell now", "you should buy", "you should sell"];

        private static void AssertBriefIsSafe(string briefText)
        {
            foreach (var phrase in ForbiddenPhrases)
                Assert.DoesNotContain(phrase, briefText, StringComparison.OrdinalIgnoreCase);
        }

        [Theory]
        [InlineData("DANGCEM is trading below its SMA50, signalling a bearish posture. RSI at 42 is neutral.")]
        [InlineData("MTNN shows a bullish crossover on MACD. RSI at 58 is neutral. No news available.")]
        [InlineData("Conflicting signals: price above SMA20 but MACD histogram is negative. Monitor carefully.")]
        [InlineData("RSI at 28 suggests oversold conditions. The stock may be due for a reversal, but confirm first.")]
        public void ValidDecisionSupportBriefs_PassSafetyCheck(string validBrief)
        {
            AssertBriefIsSafe(validBrief);
        }

        [Theory]
        [InlineData("You should buy this stock now.", "you should buy")]
        [InlineData("I recommend you buy now — signals are strong.", "buy now")]
        [InlineData("Sell now before it drops further.", "sell now")]
        [InlineData("you should sell to lock in gains.", "you should sell")]
        public void ForbiddenPhraseDetector_CatchesBadBriefs(string badBrief, string expectedPhrase)
        {
            Assert.Contains(expectedPhrase, badBrief, StringComparison.OrdinalIgnoreCase);
        }
    }
}
