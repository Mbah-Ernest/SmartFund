using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class PersonalInvestmentContributionConfiguration : IEntityTypeConfiguration<PersonalInvestmentContribution>
    {
        public void Configure(EntityTypeBuilder<PersonalInvestmentContribution> builder)
        {
            builder.ToTable("PersonalInvestmentContributions");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.WalletId).IsRequired();
            builder.HasIndex(x => x.WalletId);

            builder.Property(x => x.TrancheId).IsRequired();
            builder.HasIndex(x => x.TrancheId);

            builder.Property(x => x.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.Date).IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(500);

            builder.Property(x => x.LedgerTransactionId).IsRequired();
            builder.HasIndex(x => x.LedgerTransactionId);

            builder.HasOne(x => x.LedgerTransaction)
                .WithMany()
                .HasForeignKey(x => x.LedgerTransactionId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<PersonalWallet>()
                .WithMany()
                .HasForeignKey(x => x.WalletId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<SmartFund.Domain.Entities.Tranche>()
                .WithMany()
                .HasForeignKey(x => x.TrancheId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
