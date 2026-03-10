using System;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public interface ITrancheCodeGenerator
    {
        Task<string> NextAsync(DateTime utcNow, CancellationToken ct);
    }
}