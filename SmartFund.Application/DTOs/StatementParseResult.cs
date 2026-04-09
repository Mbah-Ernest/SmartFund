using System;
using System.Collections.Generic;

namespace SmartFund.Application.DTOs
{
    public sealed class StatementParseResult
    {
        public List<ParsedTransaction> Transactions { get; set; } = new();
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
    }

    public sealed class ParsedTransaction
    {
        public DateTime Date { get; set; }
        public string Description { get; set; } = "";
        public decimal? Debit { get; set; }
        public decimal? Credit { get; set; }
        public decimal? Balance { get; set; }
        public string? Channel { get; set; }
        public bool LowConfidence { get; set; }
    }
}
