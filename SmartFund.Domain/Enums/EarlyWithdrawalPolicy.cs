namespace SmartFund.Domain.Enums
{
    public enum EarlyWithdrawalPolicy
    {
        NotAllowed = 1,
        Allowed_LoseAllRoi = 2,
        Allowed_ProRataRoi = 3,
        Allowed_PenaltyFee = 4
    }
}