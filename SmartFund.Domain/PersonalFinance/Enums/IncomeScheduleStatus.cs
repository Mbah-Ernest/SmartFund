namespace SmartFund.Domain.PersonalFinance.Enums
{
    public enum IncomeScheduleStatus
    {
        Active    = 1,
        Paused    = 2,
        Completed = 3, // one-time received, or recurring ended
    }
}
