using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.Configurations.PersonalFinance
{
    public sealed class PersonalFinanceSettingsConfiguration : IEntityTypeConfiguration<PersonalFinanceSettings>
    {
        public void Configure(EntityTypeBuilder<PersonalFinanceSettings> builder)
        {
            builder.ToTable("PersonalFinanceSettings");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.LaunchDateUtc).IsRequired();
            builder.Property(x => x.CreatedAtUtc).IsRequired();
            builder.Property(x => x.UpdatedAtUtc).IsRequired();
            builder.Property(x => x.LastResetAtUtc);
        }
    }
}
