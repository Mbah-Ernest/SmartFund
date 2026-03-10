using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalBudget.Entities;

namespace SmartFund.Persistence.Configurations.PersonalBudget
{
    public sealed class BudgetTrackingConfiguration : IEntityTypeConfiguration<BudgetTracking>
    {
        public void Configure(EntityTypeBuilder<BudgetTracking> builder)
        {
            builder.ToTable("PersonalBudgetTracking");

            builder.HasKey(x => new { x.BudgetId, x.Year, x.Month });

            builder.Property(x => x.SpentAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.RemainingAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.HasOne<Budget>()
                .WithMany()
                .HasForeignKey(x => x.BudgetId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => new { x.Year, x.Month });
        }
    }
}
