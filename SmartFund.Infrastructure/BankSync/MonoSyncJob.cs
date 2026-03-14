using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SmartFund.Application.Services.PersonalFinance;

namespace SmartFund.Infrastructure.BankSync
{
    /// <summary>
    /// Background service that syncs all connected bank accounts on a configurable interval.
    /// Uses IServiceScopeFactory to resolve scoped services safely.
    /// </summary>
    public sealed class MonoSyncJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<MonoSyncJob> _logger;
        private readonly TimeSpan _interval;

        public MonoSyncJob(
            IServiceScopeFactory scopeFactory,
            ILogger<MonoSyncJob> logger,
            IOptions<MonoOptions> options)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
            _interval = TimeSpan.FromMinutes(options.Value.SyncIntervalMinutes);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("MonoSyncJob started. Interval: {Interval}", _interval);

            // Wait a short delay on startup so the API is fully ready before first sync
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

            using var timer = new PeriodicTimer(_interval);

            while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
            {
                _logger.LogInformation("MonoSyncJob: starting scheduled sync run at {Time}", DateTime.UtcNow);
                try
                {
                    await using var scope = _scopeFactory.CreateAsyncScope();
                    var syncService = scope.ServiceProvider.GetRequiredService<BankSyncService>();
                    await syncService.SyncAllAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "MonoSyncJob: unhandled error during sync run");
                }
            }

            _logger.LogInformation("MonoSyncJob stopped.");
        }
    }
}
