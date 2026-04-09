using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalCategory
    {
        public long Id { get; private set; } // EF

        public long UserId { get; private set; }
        public string Name { get; private set; } = default!;
        public PersonalCategoryType Type { get; private set; }

        private PersonalCategory() { } // EF

        private PersonalCategory(long userId, string name, PersonalCategoryType type)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Category name is required.");

            UserId = userId;
            Name = name.Trim();
            Type = type;
        }

        public static PersonalCategory Create(long userId, string name, PersonalCategoryType type) =>
            new PersonalCategory(userId, name, type);

        public void Rename(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Category name is required.");

            Name = name.Trim();
        }
    }
}
