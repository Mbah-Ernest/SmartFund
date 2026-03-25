using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Agent;

namespace SmartFund.Persistence.Configurations
{
    public sealed class PendingAgentActionConfiguration : IEntityTypeConfiguration<PendingAgentAction>
    {
        public void Configure(EntityTypeBuilder<PendingAgentAction> builder)
        {
            builder.ToTable("PendingAgentActions");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.ActionType)
                .HasMaxLength(100)
                .IsRequired();

            builder.Property(x => x.PayloadJson)
                .HasMaxLength(4000)
                .IsRequired();

            builder.Property(x => x.Summary)
                .HasMaxLength(500)
                .IsRequired();

            builder.Property(x => x.CreatedAtUtc).IsRequired();
            builder.Property(x => x.ExpiresAtUtc).IsRequired();

            builder.HasIndex(x => x.ExpiresAtUtc);
            builder.HasIndex(x => x.UserId);
        }
    }
}
