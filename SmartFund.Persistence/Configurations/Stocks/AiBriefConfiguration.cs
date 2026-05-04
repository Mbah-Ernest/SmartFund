using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Persistence.Configurations.Stocks
{
    public sealed class AiBriefConfiguration : IEntityTypeConfiguration<AiBrief>
    {
        public void Configure(EntityTypeBuilder<AiBrief> builder)
        {
            builder.ToTable("StockAiBriefs");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Id)
                .UseIdentityColumn();

            builder.Property(x => x.Ticker)
                .HasMaxLength(20)
                .IsRequired();

            builder.Property(x => x.GeneratedAtUtc).IsRequired();

            builder.Property(x => x.RsiValue)
                .HasColumnType("decimal(8,4)");

            builder.Property(x => x.RsiSignal)
                .HasMaxLength(30)
                .IsRequired();

            builder.Property(x => x.MacdSignal)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.PriceVsSma20)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.PriceVsSma50)
                .HasMaxLength(50)
                .IsRequired();

            builder.Property(x => x.NewsSentiment)
                .HasMaxLength(20);

            builder.Property(x => x.BriefText)
                .HasColumnType("nvarchar(max)")
                .IsRequired();

            builder.HasIndex(x => new { x.Ticker, x.GeneratedAtUtc });

            builder.HasOne<Stock>()
                .WithMany()
                .HasForeignKey(x => x.Ticker)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
