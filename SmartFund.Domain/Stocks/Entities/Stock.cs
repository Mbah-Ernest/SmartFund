using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Stocks.Entities
{
    public sealed class Stock
    {
        public string Ticker { get; private set; } = default!;
        public string TradingViewSymbol { get; private set; } = default!;
        public string CompanyName { get; private set; } = default!;
        public string? Sector { get; private set; }
        public DateTime CreatedAtUtc { get; private set; }

        private Stock() { }

        public static Stock Create(string ticker, string tradingViewSymbol, string companyName, string? sector = null)
        {
            if (string.IsNullOrWhiteSpace(ticker))
                throw new DomainException("Ticker is required.");
            if (string.IsNullOrWhiteSpace(tradingViewSymbol))
                throw new DomainException("TradingView symbol is required.");
            if (string.IsNullOrWhiteSpace(companyName))
                throw new DomainException("Company name is required.");

            return new Stock
            {
                Ticker = ticker.Trim().ToUpperInvariant(),
                TradingViewSymbol = tradingViewSymbol.Trim(),
                CompanyName = companyName.Trim(),
                Sector = sector?.Trim(),
                CreatedAtUtc = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
            };
        }

        public void UpdateDetails(string companyName, string? sector)
        {
            if (string.IsNullOrWhiteSpace(companyName))
                throw new DomainException("Company name is required.");
            CompanyName = companyName.Trim();
            Sector = sector?.Trim();
        }
    }
}
