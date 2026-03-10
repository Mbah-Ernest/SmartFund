namespace SmartFund.Persistence.DbContext
{
    public sealed class LedgerDailySequence
    {
        public string DateKey { get; set; } = default!; // "YYYYMMDD"
        public int LastNumber { get; set; }
    }
}