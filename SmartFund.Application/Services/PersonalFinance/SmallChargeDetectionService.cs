using System;
using System.Collections.Generic;
using System.Linq;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class SmallChargeDetectionService
    {
        private static readonly decimal Threshold = 1000m;

        private static readonly Dictionary<string, string[]> CategoryKeywords = new(StringComparer.OrdinalIgnoreCase)
        {
            ["levy"]    = new[] { "levy", "stamp duty", "vat on" },
            ["airtime"] = new[] { "airtime", "recharge", "topup", "top-up", "top up" },
            ["data"]    = new[] { "data", "bundle", "internet" },
            ["fees"]    = new[] { "maintenance fee", "card fee", "transfer charge", "sms", "transfer fee", "service charge", "commission" },
        };

        public void EvaluateAndTag(PersonalTransaction tx)
        {
            if (tx.Amount >= Threshold) return;

            var desc = (tx.Description ?? "").ToUpperInvariant();
            foreach (var (category, keywords) in CategoryKeywords)
            {
                if (keywords.Any(k => desc.Contains(k, StringComparison.OrdinalIgnoreCase)))
                {
                    tx.MarkAsSmallCharge(category);
                    return;
                }
            }

            // No keyword matched — skip (don't tag all sub-₦1000 transactions)
        }

        public void EvaluateAndTagAll(IEnumerable<PersonalTransaction> transactions)
        {
            foreach (var tx in transactions)
                EvaluateAndTag(tx);
        }
    }
}
