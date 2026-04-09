using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations
{
    public sealed class PersonalWalletConfiguration : IEntityTypeConfiguration<PersonalWallet>
    {
        public void Configure(EntityTypeBuilder<PersonalWallet> builder)
        {
            builder.ToTable("PersonalWallets");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.UserId).IsRequired();
            builder.HasIndex(x => x.UserId);

            builder.Property(x => x.Name).HasMaxLength(100).IsRequired();
            builder.Property(x => x.Currency).HasMaxLength(10).IsRequired();
            builder.Property(x => x.LedgerAccountId).IsRequired();
            builder.HasIndex(x => x.LedgerAccountId);
            builder.Property(x => x.CreatedAt).IsRequired();

            builder.Property(x => x.OpeningBalance)
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(0m)
                .IsRequired();

            builder.Property(x => x.OpeningBalanceDate)
                .IsRequired(false);

            builder.HasOne<SmartFund.Domain.Entities.User>()
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();

            builder.HasOne<SmartFund.Domain.Entities.LedgerAccount>()
                .WithMany()
                .HasForeignKey(x => x.LedgerAccountId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired();
        }
    }
}
