using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalCategory
    {
        public long Id { get; private set; } // EF

        public string Name { get; private set; } = default!;
        public PersonalCategoryType Type { get; private set; }

        private PersonalCategory() { } // EF

        private PersonalCategory(string name, PersonalCategoryType type)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Category name is required.");

            Name = name.Trim();
            Type = type;
        }

        public static PersonalCategory Create(string name, PersonalCategoryType type) =>
            new PersonalCategory(name, type);

        public void Rename(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Category name is required.");

            Name = name.Trim();
        }
    }
}
