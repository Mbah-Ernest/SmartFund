using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class PersonalDebtConfiguration : IEntityTypeConfiguration<PersonalDebt>
    {
        public void Configure(EntityTypeBuilder<PersonalDebt> builder)
        {
            builder.ToTable("PersonalDebts");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);
            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(x => x.CreditorName)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.PrincipalAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.TotalAmountDue)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.TotalPaid)
                .HasColumnType("decimal(18,2)")
                .IsRequired()
                .HasDefaultValue(0m);

            builder.Property(x => x.DueDate).IsRequired();
            builder.Property(x => x.Description).HasMaxLength(1000);
            builder.Property(x => x.Status).IsRequired();
            builder.Property(x => x.CreatedAt).IsRequired();
            builder.Property(x => x.UpdatedAt);

            builder.HasMany(x => x.Payments)
                .WithOne()
                .HasForeignKey(x => x.DebtId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Navigation(x => x.Payments)
                .HasField("_payments")
                .UsePropertyAccessMode(PropertyAccessMode.Field);

            // Ignore computed properties — not stored in DB
            builder.Ignore(x => x.RemainingBalance);
            builder.Ignore(x => x.InterestAmount);
            builder.Ignore(x => x.ProgressPercent);
            builder.Ignore(x => x.DaysUntilDue);
        }
    }
}
