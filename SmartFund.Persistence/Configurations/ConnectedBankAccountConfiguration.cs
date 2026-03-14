using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class ConnectedBankAccountConfiguration : IEntityTypeConfiguration<ConnectedBankAccount>
    {
        public void Configure(EntityTypeBuilder<ConnectedBankAccount> builder)
        {
            builder.ToTable("ConnectedBankAccounts");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.MonoAccountId)
                .HasMaxLength(100)
                .IsRequired();
            builder.HasIndex(x => x.MonoAccountId).IsUnique();

            builder.Property(x => x.BankName).HasMaxLength(200).IsRequired();
            builder.Property(x => x.AccountNumber).HasMaxLength(50).IsRequired();
            builder.Property(x => x.AccountName).HasMaxLength(200).IsRequired();
            builder.Property(x => x.AccountType).HasMaxLength(50).IsRequired();
            builder.Property(x => x.Currency).HasMaxLength(10).IsRequired();
            builder.Property(x => x.LastKnownBalanceKobo).IsRequired();
            builder.Property(x => x.LastSyncedAtUtc).IsRequired();
            builder.Property(x => x.ConnectedAtUtc).IsRequired();

            builder.HasIndex(x => x.ConnectedAtUtc);
        }
    }
}
