using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class PersonalDebtPaymentConfiguration : IEntityTypeConfiguration<PersonalDebtPayment>
    {
        public void Configure(EntityTypeBuilder<PersonalDebtPayment> builder)
        {
            builder.ToTable("PersonalDebtPayments");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.DebtId).IsRequired();
            builder.HasIndex(x => x.DebtId);

            builder.Property(x => x.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.PaidOn).IsRequired();
            builder.Property(x => x.Note).HasMaxLength(500);
            builder.Property(x => x.RecordedAt).IsRequired();
        }
    }
}
