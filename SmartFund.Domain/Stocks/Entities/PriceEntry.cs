using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Stocks.Entities
{
    public sealed class PriceEntry
    {
        public long Id { get; private set; }
        public string Ticker { get; private set; } = default!;
        public DateTime TradeDate { get; private set; }
        public decimal Open { get; private set; }
        public decimal High { get; private set; }
        public decimal Low { get; private set; }
        public decimal Close { get; private set; }
        public long Volume { get; private set; }
        public DateTime CreatedAtUtc { get; private set; }
        public DateTime UpdatedAtUtc { get; private set; }

        private PriceEntry() { }

        public static PriceEntry Create(string ticker, DateTime tradeDate, decimal open, decimal high, decimal low, decimal close, long volume)
        {
            if (string.IsNullOrWhiteSpace(ticker))
                throw new DomainException("Ticker is required.");
            if (high < low)
                throw new DomainException("High must be greater than or equal to low.");
            if (close < low || close > high)
                throw new DomainException("Close must be between low and high.");
            if (open <= 0 || high <= 0 || low <= 0 || close <= 0)
                throw new DomainException("OHLC prices must be positive.");
            if (volume < 0)
                throw new DomainException("Volume cannot be negative.");

            var now = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
            return new PriceEntry
            {
                Ticker = ticker.Trim().ToUpperInvariant(),
                TradeDate = DateTime.SpecifyKind(tradeDate.Date, DateTimeKind.Utc),
                Open = open,
                High = high,
                Low = low,
                Close = close,
                Volume = volume,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
        }

        public void Update(decimal open, decimal high, decimal low, decimal close, long volume)
        {
            if (high < low)
                throw new DomainException("High must be greater than or equal to low.");
            if (close < low || close > high)
                throw new DomainException("Close must be between low and high.");
            if (open <= 0 || high <= 0 || low <= 0 || close <= 0)
                throw new DomainException("OHLC prices must be positive.");
            if (volume < 0)
                throw new DomainException("Volume cannot be negative.");

            Open = open;
            High = high;
            Low = low;
            Close = close;
            Volume = volume;
            UpdatedAtUtc = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
        }
    }
}
