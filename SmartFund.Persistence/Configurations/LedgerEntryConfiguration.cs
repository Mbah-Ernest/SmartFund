using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public class LedgerEntryConfiguration : IEntityTypeConfiguration<LedgerEntry>
    {
        public void Configure(EntityTypeBuilder<LedgerEntry> builder)
        {
            builder.ToTable("LedgerEntries");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.AccountId)
                .IsRequired();

            builder.HasOne<SmartFund.Domain.Entities.LedgerAccount>()
                .WithMany()
                .HasForeignKey(x => x.AccountId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.OwnsOne(x => x.Debit, money =>
            {
                money.Property(m => m.Amount)
                    .HasColumnName("Debit")
                    .HasColumnType("decimal(18,2)")
                    .IsRequired();

                money.Property(m => m.Currency)
                    .HasColumnName("DebitCurrency")
                    .HasMaxLength(3)
                    .IsRequired();
            });

            builder.OwnsOne(x => x.Credit, money =>
            {
                money.Property(m => m.Amount)
                    .HasColumnName("Credit")
                    .HasColumnType("decimal(18,2)")
                    .IsRequired();

                money.Property(m => m.Currency)
                    .HasColumnName("CreditCurrency")
                    .HasMaxLength(3)
                    .IsRequired();
            });
        }
    }
}