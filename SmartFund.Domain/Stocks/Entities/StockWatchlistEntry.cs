using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Stocks.Entities
{
    public sealed class StockWatchlistEntry
    {
        public long Id { get; private set; }
        public long UserId { get; private set; }
        public string Ticker { get; private set; } = default!;
        public decimal? HoldingsQty { get; private set; }
        public decimal? AvgCost { get; private set; }
        public DateTime CreatedAtUtc { get; private set; }

        private StockWatchlistEntry() { }

        public static StockWatchlistEntry Create(long userId, string ticker, decimal? holdingsQty = null, decimal? avgCost = null)
        {
            if (userId <= 0)
                throw new DomainException("Valid user ID is required.");
            if (string.IsNullOrWhiteSpace(ticker))
                throw new DomainException("Ticker is required.");
            if (holdingsQty.HasValue && holdingsQty.Value < 0)
                throw new DomainException("Holdings quantity cannot be negative.");
            if (avgCost.HasValue && avgCost.Value < 0)
                throw new DomainException("Average cost cannot be negative.");

            return new StockWatchlistEntry
            {
                UserId = userId,
                Ticker = ticker.Trim().ToUpperInvariant(),
                HoldingsQty = holdingsQty,
                AvgCost = avgCost,
                CreatedAtUtc = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
            };
        }

        public void UpdateHoldings(decimal? holdingsQty, decimal? avgCost)
        {
            if (holdingsQty.HasValue && holdingsQty.Value < 0)
                throw new DomainException("Holdings quantity cannot be negative.");
            if (avgCost.HasValue && avgCost.Value < 0)
                throw new DomainException("Average cost cannot be negative.");

            HoldingsQty = holdingsQty;
            AvgCost = avgCost;
        }
    }
}
