using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Persistence.Configurations.Stocks
{
    public sealed class StockWatchlistEntryConfiguration : IEntityTypeConfiguration<StockWatchlistEntry>
    {
        public void Configure(EntityTypeBuilder<StockWatchlistEntry> builder)
        {
            builder.ToTable("StockWatchlistEntries");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .UseIdentityColumn();

            builder.Property(x => x.UserId).IsRequired();

            builder.Property(x => x.Ticker)
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.HoldingsQty)
                .HasColumnType("decimal(18,6)");

            builder.Property(x => x.AvgCost)
                .HasColumnType("decimal(18,6)");

            builder.Property(x => x.CreatedAtUtc).IsRequired();

            builder.HasIndex(x => new { x.UserId, x.Ticker }).IsUnique();
            builder.HasIndex(x => x.UserId);

            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<Stock>()
                .WithMany()
                .HasForeignKey(x => x.Ticker)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
