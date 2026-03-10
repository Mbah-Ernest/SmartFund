namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class CreatePersonalWalletRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Currency { get; set; } = "NGN";
    }
}
