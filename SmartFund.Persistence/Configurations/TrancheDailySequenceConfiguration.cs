using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Configurations
{
    public sealed class TrancheDailySequenceConfiguration : IEntityTypeConfiguration<TrancheDailySequence>
    {
        public void Configure(EntityTypeBuilder<TrancheDailySequence> builder)
        {
            builder.ToTable("TrancheDailySequences");
            builder.HasKey(x => x.DateKey);
            builder.Property(x => x.DateKey).HasMaxLength(8).IsRequired();
            builder.Property(x => x.LastNumber).IsRequired();
        }
    }
}