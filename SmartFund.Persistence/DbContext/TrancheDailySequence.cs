namespace SmartFund.Persistence.DbContext
{
    public sealed class TrancheDailySequence
    {
        public string DateKey { get; set; } = default!;
        public int LastNumber { get; set; }
    }
}