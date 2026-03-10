using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class LedgerAccountConfiguration : IEntityTypeConfiguration<LedgerAccount>
    {
        public void Configure(EntityTypeBuilder<LedgerAccount> builder)
        {
            builder.ToTable("LedgerAccounts");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
            builder.Property(x => x.Type).IsRequired();
            builder.Property(x => x.Currency).HasMaxLength(3).IsRequired();

            builder.Property(x => x.ReferenceType).IsRequired();
            builder.Property(x => x.ReferenceId);

            builder.HasIndex(x => x.Name).IsUnique(false);
            builder.HasIndex(x => new { x.ReferenceType, x.ReferenceId }).IsUnique(false);
        }
    }
}