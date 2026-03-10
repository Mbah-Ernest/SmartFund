namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class PersonalCategoryDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int Type { get; set; }
    }
}
