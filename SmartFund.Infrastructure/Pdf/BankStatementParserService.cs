using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SmartFund.Application.DTOs;
using SmartFund.Application.Interfaces;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace SmartFund.Infrastructure.Pdf
{
    public sealed class BankStatementParserService : IBankStatementParserService
    {
        private readonly IClaudeApiClient _claude;
        private readonly ILogger<BankStatementParserService> _logger;

        public BankStatementParserService(IClaudeApiClient claude, ILogger<BankStatementParserService> logger)
        {
            _claude = claude;
            _logger = logger;
        }

        public async Task<StatementParseResult> ParseAsync(Stream fileStream, string fileType, CancellationToken ct)
        {
            return fileType.ToUpperInvariant() switch
            {
                "PDF" => await ParsePdfAsync(fileStream, ct),
                "CSV" => ParseCsv(fileStream),
                _ => new StatementParseResult { Success = false, ErrorMessage = $"Unsupported file type: {fileType}" }
            };
        }

        private async Task<StatementParseResult> ParsePdfAsync(Stream fileStream, CancellationToken ct)
        {
            try
            {
                var ms = new MemoryStream();
                await fileStream.CopyToAsync(ms, ct);
                ms.Position = 0;

                var sb = new StringBuilder();
                using (var pdf = PdfDocument.Open(ms))
                {
                    foreach (var page in pdf.GetPages())
                        sb.AppendLine(page.Text);
                }

                var pdfText = sb.ToString();
                if (string.IsNullOrWhiteSpace(pdfText))
                    return new StatementParseResult { Success = false, ErrorMessage = "PDF contains no extractable text." };

                // Truncate to ~8000 chars to stay within token limits
                if (pdfText.Length > 8000)
                    pdfText = pdfText[..8000] + "\n[TRUNCATED]";

                const string systemPrompt =
                    "Parse this Nigerian bank statement text and return a JSON array of transactions. " +
                    "Each transaction must have: date (ISO format YYYY-MM-DD), description (string), " +
                    "debit (number or null), credit (number or null), balance (number or null), channel (string or null). " +
                    "Return ONLY valid JSON array, no explanation, no markdown.";

                var raw = await _claude.CompleteAsync(systemPrompt, pdfText, ct);
                return ParseJsonTransactions(raw);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "PDF parsing failed");
                return new StatementParseResult { Success = false, ErrorMessage = ex.Message };
            }
        }

        private static StatementParseResult ParseCsv(Stream fileStream)
        {
            try
            {
                using var reader = new StreamReader(fileStream, Encoding.UTF8);
                var lines = new List<string>();
                string? line;
                while ((line = reader.ReadLine()) != null)
                    lines.Add(line);

                if (lines.Count < 2)
                    return new StatementParseResult { Success = false, ErrorMessage = "CSV has no data rows." };

                var headers = lines[0].Split(',').Select(h => h.Trim().ToLowerInvariant()).ToArray();

                int dateIdx = FindIndex(headers, "date", "transaction date", "value date");
                int descIdx = FindIndex(headers, "description", "narration", "details", "particulars");
                int debitIdx = FindIndex(headers, "debit", "withdrawal", "amount (dr)", "dr");
                int creditIdx = FindIndex(headers, "credit", "deposit", "amount (cr)", "cr");
                int balanceIdx = FindIndex(headers, "balance", "running balance");

                if (dateIdx < 0 || descIdx < 0)
                    return new StatementParseResult { Success = false, ErrorMessage = "Cannot detect required columns (date, description) in CSV." };

                var transactions = new List<ParsedTransaction>();
                for (int i = 1; i < lines.Count; i++)
                {
                    var cols = SplitCsvLine(lines[i]);
                    if (cols.Length <= Math.Max(dateIdx, descIdx)) continue;

                    var dateStr = cols[dateIdx].Trim().Trim('"');
                    if (!TryParseDate(dateStr, out var date)) continue;

                    var desc = cols.ElementAtOrDefault(descIdx)?.Trim().Trim('"') ?? "";
                    var debit = ParseAmount(cols.ElementAtOrDefault(debitIdx));
                    var credit = ParseAmount(cols.ElementAtOrDefault(creditIdx));
                    var balance = ParseAmount(cols.ElementAtOrDefault(balanceIdx));

                    if (debit is null && credit is null) continue;

                    transactions.Add(new ParsedTransaction
                    {
                        Date = date,
                        Description = desc,
                        Debit = debit,
                        Credit = credit,
                        Balance = balance
                    });
                }

                return new StatementParseResult { Success = true, Transactions = transactions };
            }
            catch (Exception ex)
            {
                return new StatementParseResult { Success = false, ErrorMessage = ex.Message };
            }
        }

        private static StatementParseResult ParseJsonTransactions(string json)
        {
            try
            {
                // Claude might wrap in ```json ... ``` blocks
                json = json.Trim();
                if (json.StartsWith("```"))
                {
                    var start = json.IndexOf('[');
                    var end = json.LastIndexOf(']');
                    if (start >= 0 && end > start)
                        json = json[start..(end + 1)];
                }

                var items = JsonSerializer.Deserialize<List<JsonElement>>(json);
                if (items is null)
                    return new StatementParseResult { Success = false, ErrorMessage = "Empty JSON response." };

                var transactions = new List<ParsedTransaction>();
                foreach (var item in items)
                {
                    if (!TryGetDate(item, out var date)) continue;

                    transactions.Add(new ParsedTransaction
                    {
                        Date = date,
                        Description = item.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "",
                        Debit = TryGetDecimal(item, "debit"),
                        Credit = TryGetDecimal(item, "credit"),
                        Balance = TryGetDecimal(item, "balance"),
                        Channel = item.TryGetProperty("channel", out var ch) ? ch.GetString() : null,
                        LowConfidence = false
                    });
                }

                return new StatementParseResult { Success = true, Transactions = transactions };
            }
            catch (Exception ex)
            {
                return new StatementParseResult { Success = false, ErrorMessage = $"JSON parse error: {ex.Message}" };
            }
        }

        private static int FindIndex(string[] headers, params string[] candidates)
        {
            foreach (var c in candidates)
            {
                var idx = Array.IndexOf(headers, c);
                if (idx >= 0) return idx;
                idx = Array.FindIndex(headers, h => h.Contains(c));
                if (idx >= 0) return idx;
            }
            return -1;
        }

        private static string[] SplitCsvLine(string line)
        {
            var result = new List<string>();
            bool inQuotes = false;
            var current = new StringBuilder();
            foreach (var ch in line)
            {
                if (ch == '"') { inQuotes = !inQuotes; continue; }
                if (ch == ',' && !inQuotes) { result.Add(current.ToString()); current.Clear(); continue; }
                current.Append(ch);
            }
            result.Add(current.ToString());
            return result.ToArray();
        }

        private static bool TryParseDate(string s, out DateTime date)
        {
            var formats = new[] { "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy", "dd MMM yyyy", "MMM dd, yyyy" };
            return DateTime.TryParseExact(s, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out date)
                || DateTime.TryParse(s, out date);
        }

        private static decimal? ParseAmount(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            s = s.Trim().Trim('"').Replace(",", "").Replace("₦", "").Replace("NGN", "").Trim();
            return decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var v) && v > 0 ? v : null;
        }

        private static bool TryGetDate(JsonElement item, out DateTime date)
        {
            date = default;
            if (!item.TryGetProperty("date", out var dp)) return false;
            var s = dp.GetString();
            return s is not null && DateTime.TryParse(s, out date);
        }

        private static decimal? TryGetDecimal(JsonElement item, string prop)
        {
            if (!item.TryGetProperty(prop, out var p)) return null;
            if (p.ValueKind == JsonValueKind.Null) return null;
            if (p.ValueKind == JsonValueKind.Number && p.TryGetDecimal(out var v)) return v > 0 ? v : null;
            if (p.ValueKind == JsonValueKind.String)
            {
                var s = p.GetString()?.Trim().Replace(",", "");
                if (decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var sv)) return sv > 0 ? sv : null;
            }
            return null;
        }
    }
}
