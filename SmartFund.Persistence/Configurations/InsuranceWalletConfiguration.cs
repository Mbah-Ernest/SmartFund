using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class InsuranceWalletConfiguration : IEntityTypeConfiguration<InsuranceWallet>
    {
        public void Configure(EntityTypeBuilder<InsuranceWallet> builder)
        {
            builder.ToTable("InsuranceWallets");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Balance)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.Type)
                .IsRequired();

            builder.Property(x => x.DealId);
            builder.HasIndex(x => new { x.Type, x.DealId });

            builder.Property(x => x.ReserveAccountId)
                .IsRequired(false);

            builder.HasOne<SmartFund.Domain.Entities.LedgerAccount>()
                .WithMany()
                .HasForeignKey(x => x.ReserveAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<SmartFund.Domain.Entities.Deal>()
                .WithMany()
                .HasForeignKey(x => x.DealId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
