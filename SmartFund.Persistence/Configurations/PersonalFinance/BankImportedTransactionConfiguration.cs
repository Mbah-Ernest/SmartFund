using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class BankImportedTransactionConfiguration : IEntityTypeConfiguration<BankImportedTransaction>
    {
        public void Configure(EntityTypeBuilder<BankImportedTransaction> builder)
        {
            builder.ToTable("BankImportedTransactions");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.ConnectedBankAccountId).IsRequired();

            builder.Property(x => x.MonoTransactionId)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.IdempotencyHash)
                .HasMaxLength(64)
                .IsRequired();

            // Unique dedup index: one row per (Mono ID, account)
            builder.HasIndex(x => new { x.MonoTransactionId, x.ConnectedBankAccountId }).IsUnique();
            // Fallback dedup index: hash alone must also be unique
            builder.HasIndex(x => x.IdempotencyHash).IsUnique();

            builder.Property(x => x.AmountKobo).IsRequired();

            builder.Property(x => x.Direction)
                .HasMaxLength(10)
                .IsRequired();

            builder.Property(x => x.RawNarration)
                .HasMaxLength(500)
                .IsRequired();

            builder.Property(x => x.NormalizedNarration).HasMaxLength(500);
            builder.Property(x => x.ExtractedMerchant).HasMaxLength(200);
            builder.Property(x => x.TransactionDateUtc).IsRequired();
            builder.Property(x => x.ImportedAtUtc).IsRequired();
            builder.Property(x => x.Status).IsRequired();
            builder.Property(x => x.IsPending).IsRequired();
            builder.Property(x => x.IsReversal).IsRequired();
            builder.Property(x => x.ReversalOfMonoId).HasMaxLength(200);
            builder.Property(x => x.ReviewNote).HasMaxLength(500);

            // Composite index used for inbox queries
            builder.HasIndex(x => new { x.Status, x.ImportedAtUtc });

            builder.HasOne<ConnectedBankAccount>()
                .WithMany()
                .HasForeignKey(x => x.ConnectedBankAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<PersonalTransaction>()
                .WithMany()
                .HasForeignKey(x => x.LinkedPersonalTransactionId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
