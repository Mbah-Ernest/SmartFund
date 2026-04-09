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

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);
            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

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
            builder.Property(x => x.SyncStatus).IsRequired();
            builder.Property(x => x.LastSyncError).HasMaxLength(1000);
            builder.Property(x => x.TotalTransactionsSynced).IsRequired();

            builder.Property(x => x.PersonalWalletId);

            builder.HasOne<PersonalWallet>()
                .WithMany()
                .HasForeignKey(x => x.PersonalWalletId)
                .OnDelete(DeleteBehavior.SetNull)
                .IsRequired(false);

            builder.HasIndex(x => x.ConnectedAtUtc);
        }
    }
}
