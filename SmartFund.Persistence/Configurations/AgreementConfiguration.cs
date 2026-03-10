using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class AgreementConfiguration : IEntityTypeConfiguration<Agreement>
    {
        public void Configure(EntityTypeBuilder<Agreement> builder)
        {
            builder.ToTable("Agreements");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.TrancheId).IsRequired();
            builder.Property(x => x.Version).IsRequired();

            builder.Property(x => x.SignedName)
                .HasMaxLength(200)
                .IsRequired();

            builder.Property(x => x.SignedAtUtc)
                .IsRequired();

            builder.Property(x => x.DocumentUrl)
                .HasMaxLength(1000)
                .IsRequired();

            builder.HasIndex(x => new { x.TrancheId, x.Version }).IsUnique();

            builder.HasOne<Tranche>()
                .WithMany()
                .HasForeignKey(x => x.TrancheId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
