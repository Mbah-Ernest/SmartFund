using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class PersonalGoalConfiguration : IEntityTypeConfiguration<PersonalGoal>
    {
        public void Configure(EntityTypeBuilder<PersonalGoal> builder)
        {
            builder.ToTable("PersonalGoals");
            builder.HasKey(x => x.Id);


            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);
            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.TargetAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.SavedAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.Deadline).IsRequired();
            builder.Property(x => x.CreatedAt).IsRequired();

            builder.Property(x => x.WalletId).IsRequired(false);
            builder.HasIndex(x => x.WalletId);
            builder.HasOne<PersonalWallet>()
                .WithMany()
                .HasForeignKey(x => x.WalletId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
