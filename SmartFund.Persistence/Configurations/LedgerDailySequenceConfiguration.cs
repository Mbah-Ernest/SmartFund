using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Configurations
{
    public sealed class LedgerDailySequenceConfiguration : IEntityTypeConfiguration<LedgerDailySequence>
    {
        public void Configure(EntityTypeBuilder<LedgerDailySequence> builder)
        {
            builder.ToTable("LedgerDailySequences");
            builder.HasKey(x => x.DateKey);
            builder.Property(x => x.DateKey).HasMaxLength(8).IsRequired();
            builder.Property(x => x.LastNumber).IsRequired();
        }
    }
}