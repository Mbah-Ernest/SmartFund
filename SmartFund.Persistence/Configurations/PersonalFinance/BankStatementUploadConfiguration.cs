using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class BankStatementUploadConfiguration : IEntityTypeConfiguration<BankStatementUpload>
    {
        public void Configure(EntityTypeBuilder<BankStatementUpload> builder)
        {
            builder.ToTable("BankStatementUploads");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);

            builder.Property(x => x.FileName)
                .IsRequired()
                .HasMaxLength(260);

            builder.Property(x => x.FileType)
                .IsRequired()
                .HasMaxLength(16);

            builder.Property(x => x.Status)
                .IsRequired()
                .HasMaxLength(32);

            builder.Property(x => x.ErrorMessage)
                .HasMaxLength(2000);

            builder.Property(x => x.CreatedAtUtc).IsRequired();

            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
