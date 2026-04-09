namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class BulkCreateCategoriesRequest
    {
        public BulkCategoryItem[] Categories { get; set; } = [];
    }

    public sealed class BulkCategoryItem
    {
        public string Name { get; set; } = string.Empty;
        public int Type { get; set; }
    }
}
