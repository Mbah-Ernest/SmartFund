using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class TrancheConfiguration : IEntityTypeConfiguration<Tranche>
    {
        public void Configure(EntityTypeBuilder<Tranche> builder)
        {
            builder.ToTable("Tranches");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.TrancheCode).HasMaxLength(30).IsRequired();
            builder.HasIndex(x => x.TrancheCode).IsUnique();

            builder.Property(x => x.InvestorId).IsRequired();
            builder.HasIndex(x => x.InvestorId);
            builder.Property(x => x.DealId);
            builder.HasIndex(x => x.DealId);

            builder.Property(x => x.Principal).HasColumnType("decimal(18,2)").IsRequired();

            builder.Property(x => x.RoiType).IsRequired();
            builder.Property(x => x.RoiRate).HasColumnType("decimal(9,6)").IsRequired();

            builder.Property(x => x.StartDate).IsRequired();
            builder.Property(x => x.MaturityDate).IsRequired();

            builder.Property(x => x.PayoutType).IsRequired();
            builder.Property(x => x.NoticeDays);

            builder.Property(x => x.EarlyWithdrawalPolicy).IsRequired();

            builder.Property(x => x.LiabilityAccountId).IsRequired();

            builder.HasOne<SmartFund.Domain.Entities.LedgerAccount>()
                .WithMany()
                .HasForeignKey(x => x.LiabilityAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<Investor>()
                .WithMany()
                .HasForeignKey(x => x.InvestorId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<Deal>()
                .WithMany()
                .HasForeignKey(x => x.DealId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}