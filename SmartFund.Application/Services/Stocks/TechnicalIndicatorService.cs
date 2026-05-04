using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Application.Services.Stocks
{
    public sealed class StockCandle
    {
        public DateTime Date { get; init; }
        public decimal Open { get; init; }
        public decimal High { get; init; }
        public decimal Low { get; init; }
        public decimal Close { get; init; }
        public long Volume { get; init; }
    }

    public sealed class MacdResult
    {
        public decimal MacdLine { get; init; }
        public decimal SignalLine { get; init; }
        public decimal Histogram { get; init; }
    }

    public sealed class TechnicalSummary
    {
        public decimal? RsiValue { get; init; }
        public string RsiSignal { get; init; } = "Neutral";
        public string MacdSignal { get; init; } = "Neutral";
        public decimal MacdHistogram { get; init; }
        public string PriceVsSma20 { get; init; } = "Unknown";
        public string PriceVsSma50 { get; init; } = "Unknown";
    }

    public sealed class TechnicalIndicatorService
    {
        public decimal? Sma(IReadOnlyList<decimal> closes, int period)
        {
            if (closes.Count < period) return null;
            return closes.TakeLast(period).Average();
        }

        public decimal? Ema(IReadOnlyList<decimal> closes, int period)
        {
            if (closes.Count < period) return null;

            var k = 2m / (period + 1);
            decimal ema = closes.Take(period).Average();
            foreach (var price in closes.Skip(period))
                ema = price * k + ema * (1 - k);
            return ema;
        }

        public decimal? Rsi(IReadOnlyList<decimal> closes, int period = 14)
        {
            if (closes.Count < period + 1) return null;

            var gains = new List<decimal>();
            var losses = new List<decimal>();

            for (int i = 1; i < closes.Count; i++)
            {
                var delta = closes[i] - closes[i - 1];
                gains.Add(delta > 0 ? delta : 0);
                losses.Add(delta < 0 ? -delta : 0);
            }

            // Wilder's smoothing: initial average over first `period` values
            decimal avgGain = gains.Take(period).Average();
            decimal avgLoss = losses.Take(period).Average();

            for (int i = period; i < gains.Count; i++)
            {
                avgGain = (avgGain * (period - 1) + gains[i]) / period;
                avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
            }

            if (avgLoss == 0) return 100m;
            var rs = avgGain / avgLoss;
            return Math.Round(100m - 100m / (1 + rs), 2);
        }

        public MacdResult? Macd(IReadOnlyList<decimal> closes, int fast = 12, int slow = 26, int signal = 9)
        {
            if (closes.Count < slow + signal - 1) return null;

            // Build EMA series for macd line
            var macdLine = new List<decimal>();
            var k12 = 2m / (fast + 1);
            var k26 = 2m / (slow + 1);

            decimal ema12 = closes.Take(fast).Average();
            decimal ema26 = closes.Take(slow).Average();

            // Walk forward from slow onwards to get macd values
            // Rebuild properly: compute ema12 and ema26 in lockstep from index 0
            ema12 = closes.Take(fast).Average();
            ema26 = closes.Take(slow).Average();

            for (int i = fast; i < slow; i++)
                ema12 = closes[i] * k12 + ema12 * (1 - k12);

            for (int i = slow; i < closes.Count; i++)
            {
                ema12 = closes[i] * k12 + ema12 * (1 - k12);
                ema26 = closes[i] * k26 + ema26 * (1 - k26);
                macdLine.Add(ema12 - ema26);
            }

            if (macdLine.Count < signal) return null;

            // Signal line = EMA of macdLine
            var ks = 2m / (signal + 1);
            decimal signalLine = macdLine.Take(signal).Average();
            for (int i = signal; i < macdLine.Count; i++)
                signalLine = macdLine[i] * ks + signalLine * (1 - ks);

            var lastMacd = macdLine.Last();
            var histogram = lastMacd - signalLine;

            return new MacdResult
            {
                MacdLine = Math.Round(lastMacd, 4),
                SignalLine = Math.Round(signalLine, 4),
                Histogram = Math.Round(histogram, 4)
            };
        }

        public TechnicalSummary Analyse(IReadOnlyList<StockCandle> candles)
        {
            if (candles.Count == 0)
                return new TechnicalSummary
                {
                    RsiSignal = "Insufficient data",
                    MacdSignal = "Insufficient data",
                    PriceVsSma20 = "Insufficient data",
                    PriceVsSma50 = "Insufficient data"
                };

            var closes = candles.OrderBy(c => c.Date).Select(c => c.Close).ToList();
            var latestClose = closes.Last();

            var rsiValue = Rsi(closes);
            var sma20 = Sma(closes, 20);
            var sma50 = Sma(closes, 50);
            var macdResult = Macd(closes);

            var rsiSignal = rsiValue switch
            {
                null => "Insufficient data",
                <= 30 => "Oversold",
                >= 70 => "Overbought",
                _ => "Neutral"
            };

            var priceVsSma20 = sma20 switch
            {
                null => "Insufficient data",
                var s when latestClose > s => "Above SMA20 (bullish)",
                var s when latestClose < s => "Below SMA20 (bearish)",
                _ => "At SMA20"
            };

            var priceVsSma50 = sma50 switch
            {
                null => "Insufficient data",
                var s when latestClose > s => "Above SMA50 (bullish)",
                var s when latestClose < s => "Below SMA50 (bearish)",
                _ => "At SMA50"
            };

            var macdSignal = macdResult switch
            {
                null => "Insufficient data",
                { Histogram: > 0 } r when r.MacdLine > r.SignalLine => "Bullish crossover",
                { Histogram: < 0 } r when r.MacdLine < r.SignalLine => "Bearish crossover",
                { Histogram: > 0 } => "Bullish momentum",
                { Histogram: < 0 } => "Bearish momentum",
                _ => "Neutral"
            };

            return new TechnicalSummary
            {
                RsiValue = rsiValue,
                RsiSignal = rsiSignal,
                MacdSignal = macdSignal,
                MacdHistogram = macdResult?.Histogram ?? 0,
                PriceVsSma20 = priceVsSma20,
                PriceVsSma50 = priceVsSma50
            };
        }

        public static IReadOnlyList<StockCandle> ToCandleList(IEnumerable<PriceEntry> entries) =>
            entries.Select(e => new StockCandle
            {
                Date = e.TradeDate,
                Open = e.Open,
                High = e.High,
                Low = e.Low,
                Close = e.Close,
                Volume = e.Volume
            }).OrderBy(c => c.Date).ToList();
    }
}
