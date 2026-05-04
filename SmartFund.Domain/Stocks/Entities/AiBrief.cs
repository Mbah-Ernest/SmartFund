using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Stocks.Entities
{
    public sealed class AiBrief
    {
        public long Id { get; private set; }
        public string Ticker { get; private set; } = default!;
        public DateTime GeneratedAtUtc { get; private set; }
        public decimal? RsiValue { get; private set; }
        public string RsiSignal { get; private set; } = default!;
        public string MacdSignal { get; private set; } = default!;
        public string PriceVsSma20 { get; private set; } = default!;
        public string PriceVsSma50 { get; private set; } = default!;
        public string? NewsSentiment { get; private set; }
        public string BriefText { get; private set; } = default!;

        private AiBrief() { }

        public static AiBrief Create(
            string ticker,
            decimal? rsiValue,
            string rsiSignal,
            string macdSignal,
            string priceVsSma20,
            string priceVsSma50,
            string? newsSentiment,
            string briefText)
        {
            if (string.IsNullOrWhiteSpace(ticker))
                throw new DomainException("Ticker is required.");
            if (string.IsNullOrWhiteSpace(briefText))
                throw new DomainException("Brief text is required.");

            return new AiBrief
            {
                Ticker = ticker.Trim().ToUpperInvariant(),
                GeneratedAtUtc = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc),
                RsiValue = rsiValue,
                RsiSignal = rsiSignal ?? "Neutral",
                MacdSignal = macdSignal ?? "Neutral",
                PriceVsSma20 = priceVsSma20 ?? "Unknown",
                PriceVsSma50 = priceVsSma50 ?? "Unknown",
                NewsSentiment = newsSentiment,
                BriefText = briefText.Trim()
            };
        }
    }
}
