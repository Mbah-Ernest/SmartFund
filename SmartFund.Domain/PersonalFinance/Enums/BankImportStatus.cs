namespace SmartFund.Domain.PersonalFinance.Enums
{
    public enum BankImportStatus
    {
        NeedsReview = 1,
        AutoPosted = 2,      // Rule matched; posted without user action
        ManuallyPosted = 3,  // User reviewed and categorized
        Excluded = 4,        // User excluded; not reflected in ledger
        Pending = 5,         // Bank flagged as pending; awaiting settlement
        Reversed = 6         // Matched to a reversal entry; zeroed out
    }
}
