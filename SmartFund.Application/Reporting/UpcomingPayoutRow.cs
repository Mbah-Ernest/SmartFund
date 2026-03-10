using System;

namespace SmartFund.Application.Reporting;

public readonly record struct UpcomingPayoutRow(
    long TrancheId,
    string TrancheCode,
    long InvestorId,
    string InvestorName,
    DateTime MaturityDate,
    decimal Principal,
    decimal InterestAmount,
    decimal TotalPayable);
