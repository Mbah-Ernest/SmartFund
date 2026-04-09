using System.IO;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.DTOs;

namespace SmartFund.Application.Interfaces
{
    public interface IBankStatementParserService
    {
        Task<StatementParseResult> ParseAsync(Stream fileStream, string fileType, CancellationToken ct);
    }
}
