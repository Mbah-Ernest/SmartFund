using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class DealConfiguration : IEntityTypeConfiguration<Deal>
    {
        public void Configure(EntityTypeBuilder<Deal> builder)
        {
            builder.ToTable("Deals");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.DealCode)
                .HasMaxLength(30)
                .IsRequired();

            builder.HasIndex(x => x.DealCode).IsUnique();

            builder.Property(x => x.Title)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.BorrowerName)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.LoanAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();

            builder.Property(x => x.InterestRate)
                .HasColumnType("decimal(9,6)")
                .IsRequired();

            builder.Property(x => x.TenureMonths)
                .IsRequired();

            builder.Property(x => x.Status)
                .IsRequired();

            builder.Property(x => x.CreatedAtUtc)
                .IsRequired();
        }
    }
}
