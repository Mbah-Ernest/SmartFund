using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class RecurringPatternConfiguration : IEntityTypeConfiguration<RecurringPattern>
    {
        public void Configure(EntityTypeBuilder<RecurringPattern> builder)
        {
            builder.ToTable("RecurringPatterns");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);

            builder.Property(x => x.Description)
                .IsRequired()
                .HasMaxLength(500);

            builder.Property(x => x.AverageAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.Frequency)
                .IsRequired()
                .HasMaxLength(32);

            builder.Property(x => x.Category)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.PatternType)
                .IsRequired();

            builder.Property(x => x.FirstSeen).IsRequired();
            builder.Property(x => x.LastSeen).IsRequired();
            builder.Property(x => x.OccurrenceCount).IsRequired();
            builder.Property(x => x.DetectedAtUtc).IsRequired();

            builder.HasIndex(x => new { x.UserId, x.Description });

            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
