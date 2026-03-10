using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class PersonalCategoryConfiguration : IEntityTypeConfiguration<PersonalCategory>
    {
        public void Configure(EntityTypeBuilder<PersonalCategory> builder)
        {
            builder.ToTable("PersonalCategories");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.Type)
                .IsRequired();

            builder.HasIndex(x => new { x.Type, x.Name }).IsUnique();
        }
    }
}
