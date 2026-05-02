using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class IncomeScheduleItemConfiguration : IEntityTypeConfiguration<IncomeScheduleItem>
    {
        public void Configure(EntityTypeBuilder<IncomeScheduleItem> builder)
        {
            builder.ToTable("IncomeScheduleItems");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);

            builder.Property(x => x.Label).HasMaxLength(150).IsRequired();
            builder.Property(x => x.Amount).HasColumnType("decimal(18,2)").IsRequired();

            builder.Property(x => x.Direction).HasConversion<int>().IsRequired();
            builder.Property(x => x.Kind).HasConversion<int>().IsRequired();
            builder.Property(x => x.RecurrenceInterval).HasConversion<int?>().IsRequired(false);
            builder.Property(x => x.Status).HasConversion<int>().IsRequired();

            builder.Property(x => x.NextExpectedDate).IsRequired();
            builder.Property(x => x.EndDate).IsRequired(false);
            builder.Property(x => x.Notes).IsRequired(false);
            builder.Property(x => x.CreatedAt).IsRequired();
            builder.Property(x => x.UpdatedAt).IsRequired(false);

            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();
        }
    }
}
