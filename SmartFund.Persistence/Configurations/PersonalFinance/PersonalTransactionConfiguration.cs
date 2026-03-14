using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class PersonalTransactionConfiguration : IEntityTypeConfiguration<PersonalTransaction>
    {
        public void Configure(EntityTypeBuilder<PersonalTransaction> builder)
        {
            builder.ToTable("PersonalTransactions");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.WalletId).IsRequired();
            builder.HasIndex(x => x.WalletId);

            builder.Property(x => x.CategoryId);
            builder.HasIndex(x => x.CategoryId);

            builder.Property(x => x.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.TransactionType)
                .IsRequired();

            builder.Property(x => x.Date)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(500);

            builder.Property(x => x.LedgerTransactionId).IsRequired();
            builder.HasIndex(x => x.LedgerTransactionId);

            builder.HasOne<PersonalWallet>()
                .WithMany()
                .HasForeignKey(x => x.WalletId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<PersonalCategory>()
                .WithMany()
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<SmartFund.Domain.Entities.LedgerTransaction>()
                .WithMany()
                .HasForeignKey(x => x.LedgerTransactionId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(x => x.SourceConnectedBankAccountId);
            builder.Property(x => x.SourceBankImportedTransactionId);
            builder.HasIndex(x => x.SourceBankImportedTransactionId);
        }
    }
}
