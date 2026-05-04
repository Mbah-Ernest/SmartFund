using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Persistence.Configurations.Stocks
{
    public sealed class PriceEntryConfiguration : IEntityTypeConfiguration<PriceEntry>
    {
        public void Configure(EntityTypeBuilder<PriceEntry> builder)
        {
            builder.ToTable("StockPriceEntries");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .UseIdentityColumn();

            builder.Property(x => x.Ticker)
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.TradeDate)
                .HasColumnType("date")
                .IsRequired();

            builder.Property(x => x.Open)
                .HasColumnType("decimal(18,6)")
                .IsRequired();

            builder.Property(x => x.High)
                .HasColumnType("decimal(18,6)")
                .IsRequired();

            builder.Property(x => x.Low)
                .HasColumnType("decimal(18,6)")
                .IsRequired();

            builder.Property(x => x.Close)
                .HasColumnType("decimal(18,6)")
                .IsRequired();

            builder.Property(x => x.Volume)
                .IsRequired();

            builder.Property(x => x.CreatedAtUtc).IsRequired();
            builder.Property(x => x.UpdatedAtUtc).IsRequired();

            builder.HasIndex(x => new { x.Ticker, x.TradeDate }).IsUnique();
            builder.HasIndex(x => x.Ticker);

            builder.HasOne<Stock>()
                .WithMany()
                .HasForeignKey(x => x.Ticker)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
