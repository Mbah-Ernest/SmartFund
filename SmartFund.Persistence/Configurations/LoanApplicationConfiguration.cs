using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class LoanApplicationConfiguration : IEntityTypeConfiguration<LoanApplication>
    {
        public void Configure(EntityTypeBuilder<LoanApplication> builder)
        {
            builder.ToTable("LoanApplications");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);
            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(x => x.Amount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.PurposeCategory).IsRequired();

            builder.Property(x => x.PurposeDescription)
                .HasMaxLength(1000)
                .IsRequired();

            builder.Property(x => x.DurationDays).IsRequired();

            builder.Property(x => x.RepaymentInstallments).IsRequired();

            builder.Property(x => x.AccountNumber)
                .HasMaxLength(30)
                .IsRequired();

            builder.Property(x => x.BankName)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.AccountName)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.DailyInterestRate)
                .HasColumnType("decimal(9,4)")
                .IsRequired();

            builder.Property(x => x.InterestAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.TotalRepayable)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.InstallmentAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.Status).IsRequired();
            builder.HasIndex(x => x.Status);

            builder.Property(x => x.SubmittedAtUtc).IsRequired();
            builder.Property(x => x.ReviewedAtUtc);
            builder.Property(x => x.ReviewedByUserId);

            builder.Property(x => x.AdminNote).HasMaxLength(2000);

            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.ReviewedByUserId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);
        }
    }
}
