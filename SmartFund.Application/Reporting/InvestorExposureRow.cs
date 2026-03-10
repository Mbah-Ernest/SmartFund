namespace SmartFund.Application.Reporting;

public readonly record struct InvestorExposureRow(
    long InvestorId,
    string FullName,
    string Email,
    int TrancheCount,
    decimal TotalPrincipal);
