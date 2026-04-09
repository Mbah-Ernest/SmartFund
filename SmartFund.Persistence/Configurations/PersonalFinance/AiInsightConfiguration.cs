using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class AiInsightConfiguration : IEntityTypeConfiguration<AiInsight>
    {
        public void Configure(EntityTypeBuilder<AiInsight> builder)
        {
            builder.ToTable("AiInsights");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);

            builder.Property(x => x.InsightsJson)
                .IsRequired();

            builder.Property(x => x.GeneratedAtUtc).IsRequired();
            builder.Property(x => x.ExpiresAtUtc).IsRequired();

            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
