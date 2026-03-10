namespace SmartFund.Application.Reporting;

public readonly record struct InsuranceBufferReport(
    decimal TotalExposure,
    decimal TotalInsuranceReserve,
    decimal CoverageRatio);
