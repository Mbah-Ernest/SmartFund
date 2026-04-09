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

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);
            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(x => x.Type)
                .IsRequired();

            // Unique per user: two users can both have a "Food" expense category
            builder.HasIndex(x => new { x.UserId, x.Type, x.Name }).IsUnique();
        }
    }
}
