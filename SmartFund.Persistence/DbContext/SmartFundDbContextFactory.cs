using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SmartFund.Persistence.DbContext
{
    public sealed class SmartFundDbContextFactory : IDesignTimeDbContextFactory<SmartFundDbContext>
    {
        public SmartFundDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<SmartFundDbContext>();

            // LocalDB (Windows). If you prefer full SQL Server, replace Server=...
            var connectionString =
                "Server=(localdb)\\mssqllocaldb;Database=SmartFundDb;Trusted_Connection=True;MultipleActiveResultSets=true";

            optionsBuilder.UseSqlServer(connectionString);

            return new SmartFundDbContext(optionsBuilder.Options);
        }
    }
}