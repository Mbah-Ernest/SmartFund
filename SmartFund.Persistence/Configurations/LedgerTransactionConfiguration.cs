using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public class LedgerTransactionConfiguration : IEntityTypeConfiguration<LedgerTransaction>
    {
        public void Configure(EntityTypeBuilder<LedgerTransaction> builder)
        {
            builder.ToTable("LedgerTransactions");

            builder.HasKey(x => x.Id);

            builder.Property(x => x.Narration)
                .HasMaxLength(500)
                .IsRequired();

            builder.Property(x => x.ReferenceType).IsRequired();
            builder.Property(x => x.ReferenceId);

            builder.Property(x => x.Status)
                .IsRequired();

            builder.Property(x => x.SequenceNumber)
                .HasMaxLength(50);

            builder.Navigation(x => x.Entries)
                .UsePropertyAccessMode(Microsoft.EntityFrameworkCore.PropertyAccessMode.Field);

            builder.HasMany(x => x.Entries)
                .WithOne()
                .HasForeignKey("LedgerTransactionId")
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}