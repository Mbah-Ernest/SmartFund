using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public interface IClaudeApiClient
    {
        Task<string> CompleteAsync(string systemPrompt, string userMessage, CancellationToken ct);
    }
}
