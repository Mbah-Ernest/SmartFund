using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Persistence.Configurations
{
    public sealed class PersonalTransactionConfiguration : IEntityTypeConfiguration<PersonalTransaction>
    {
        public void Configure(EntityTypeBuilder<PersonalTransaction> builder)
        {
            builder.ToTable("PersonalTransactions");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);

            builder.Property(x => x.WalletId).IsRequired();
            builder.HasIndex(x => x.WalletId);

            builder.Property(x => x.CategoryId).IsRequired(false);
            builder.HasIndex(x => x.CategoryId);

            builder.Property(x => x.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.TransactionType).IsRequired();
            builder.Property(x => x.Date).IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(500)
                .IsRequired(false);

            builder.Property(x => x.LedgerTransactionId).IsRequired();
            builder.HasIndex(x => x.LedgerTransactionId);

            builder.Property(x => x.SourceConnectedBankAccountId).IsRequired(false);
            builder.Property(x => x.SourceBankImportedTransactionId).IsRequired(false);
            builder.HasIndex(x => x.SourceBankImportedTransactionId);

            builder.Property(x => x.IsSmallCharge).IsRequired();
            builder.Property(x => x.SmallChargeCategory).IsRequired(false);

            builder.Property(x => x.Source)
                .HasDefaultValue(TransactionSource.Manual)
                .IsRequired();

            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            builder.HasOne<SmartFund.Domain.PersonalFinance.Entities.PersonalWallet>()
                .WithMany()
                .HasForeignKey(x => x.WalletId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            builder.HasOne<SmartFund.Domain.Entities.LedgerTransaction>()
                .WithMany()
                .HasForeignKey(x => x.LedgerTransactionId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            builder.HasOne<SmartFund.Domain.PersonalFinance.Entities.PersonalCategory>()
                .WithMany()
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
