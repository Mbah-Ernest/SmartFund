namespace SmartFund.Application.Reporting.PersonalFinance
{
    /// <summary>
    /// Cash runway calculation based on the last 3 complete calendar months of expense data.
    /// </summary>
    public sealed record CashRunwayDto(
        /// <summary>Total balance across all wallets today.</summary>
        decimal TotalBalanceNaira,

        /// <summary>Average monthly expenses over the last 3 complete calendar months.</summary>
        decimal AvgMonthlyBurnNaira,

        /// <summary>Estimated months of runway. Null when average burn is zero.</summary>
        decimal? RunwayMonths,

        /// <summary>Expenses in the most recent complete calendar month.</summary>
        decimal LastMonthBurnNaira,

        /// <summary>
        /// Fractional change of last month's burn vs the 3-month average.
        /// Positive = spending is rising; negative = spending is falling.
        /// E.g. 0.12 means burn is 12% above average.
        /// Zero when there is no historical burn data.
        /// </summary>
        decimal BurnTrend
    );
}
