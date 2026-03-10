namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class CreatePersonalCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
        public int Type { get; set; }
    }
}
