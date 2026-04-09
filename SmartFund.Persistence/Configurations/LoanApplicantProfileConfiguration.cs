using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class LoanApplicantProfileConfiguration : IEntityTypeConfiguration<LoanApplicantProfile>
    {
        public void Configure(EntityTypeBuilder<LoanApplicantProfile> builder)
        {
            builder.ToTable("LoanApplicantProfiles");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId).IsUnique();
            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Property(x => x.SubmittedName)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.FullName)
                .HasMaxLength(200);

            builder.Property(x => x.PhoneNumber)
                .HasMaxLength(30);

            builder.Property(x => x.EmailAddress)
                .HasMaxLength(200);

            builder.Property(x => x.EmergencyContactNumber)
                .HasMaxLength(30);

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
