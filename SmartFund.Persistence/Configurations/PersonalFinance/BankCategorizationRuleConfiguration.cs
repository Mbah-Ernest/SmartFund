using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class BankCategorizationRuleConfiguration : IEntityTypeConfiguration<BankCategorizationRule>
    {
        public void Configure(EntityTypeBuilder<BankCategorizationRule> builder)
        {
            builder.ToTable("BankCategorizationRules");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);
            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(x => x.MatchText).HasMaxLength(500).IsRequired();
            builder.Property(x => x.IsRegex).IsRequired();
            builder.Property(x => x.CaseSensitive).IsRequired();
            builder.Property(x => x.CategoryId).IsRequired();
            builder.Property(x => x.TransactionType).IsRequired();
            builder.Property(x => x.Priority).IsRequired();
            builder.Property(x => x.IsActive).IsRequired();
            builder.Property(x => x.AutoPostCredits).IsRequired();
            builder.Property(x => x.Description).HasMaxLength(200);
            builder.Property(x => x.CreatedAtUtc).IsRequired();
            builder.Property(x => x.MatchCount).IsRequired();

            // Index for rule evaluation: only active rules, in priority order
            builder.HasIndex(x => new { x.IsActive, x.Priority });

            builder.HasOne<PersonalCategory>()
                .WithMany()
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
