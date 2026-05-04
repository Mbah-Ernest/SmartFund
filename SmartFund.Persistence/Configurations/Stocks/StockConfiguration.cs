using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Persistence.Configurations.Stocks
{
    public sealed class StockConfiguration : IEntityTypeConfiguration<Stock>
    {
        public void Configure(EntityTypeBuilder<Stock> builder)
        {
            builder.ToTable("Stocks");
            builder.HasKey(x => x.Ticker);

            builder.Property(x => x.Ticker)
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.TradingViewSymbol)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.CompanyName)
                .HasMaxLength(150)
                .IsRequired();

            builder.Property(x => x.Sector)
                .HasMaxLength(100);

            builder.Property(x => x.CreatedAtUtc)
                .IsRequired();
        }
    }
}
