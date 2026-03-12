using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class AuditEntryConfiguration : IEntityTypeConfiguration<AuditEntry>
    {
        public void Configure(EntityTypeBuilder<AuditEntry> builder)
        {
            builder.ToTable("AuditEntries");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Category).IsRequired();
            builder.HasIndex(x => x.Category);

            builder.Property(x => x.Action)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.Description)
                .HasMaxLength(1000)
                .IsRequired();

            builder.Property(x => x.LedgerTransactionId);
            builder.HasIndex(x => x.LedgerTransactionId);

            builder.Property(x => x.ReversesAuditEntryId);
            builder.Property(x => x.ReversedByAuditEntryId);

            builder.Property(x => x.CreatedAtUtc).IsRequired();
            builder.HasIndex(x => x.CreatedAtUtc);
        }
    }
}
