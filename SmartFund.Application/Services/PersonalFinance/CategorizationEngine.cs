using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.Services.PersonalFinance
{
    /// <summary>
    /// Stateless engine that normalizes narrations and evaluates categorization rules.
    /// Called synchronously during sync pipeline — no DB access.
    /// </summary>
    public sealed class CategorizationEngine
    {
        // Noise tokens stripped during normalization (order matters)
        private static readonly string[] NoisePatterns =
        [
            @"VIA USSD", @"VIA MOBILE", @"WEB PURCHASE", @"POS PURCHASE", @"POS DEBIT",
            @"INTERNET BANKING", @"MOBILE BANKING", @"BANK TRANSFER", @"NIP/",
            @"\bREF[:\s][A-Z0-9]+\b", @"\bTRN[:\s][A-Z0-9]+\b", @"\d{6,}", @"[\|/\\].*$"
        ];

        private static readonly Regex[] NoiseRegexes;

        static CategorizationEngine()
        {
            NoiseRegexes = new Regex[NoisePatterns.Length];
            for (var i = 0; i < NoisePatterns.Length; i++)
                NoiseRegexes[i] = new Regex(NoisePatterns[i], RegexOptions.Compiled | RegexOptions.IgnoreCase);
        }

        /// <summary>
        /// Returns normalized (uppercase, noise-stripped) version of the raw narration.
        /// </summary>
        public string Normalize(string rawNarration)
        {
            if (string.IsNullOrWhiteSpace(rawNarration))
                return "BANK TRANSACTION";

            var normalized = rawNarration.Trim().ToUpperInvariant();

            foreach (var rx in NoiseRegexes)
                normalized = rx.Replace(normalized, " ");

            // Collapse multiple whitespace
            normalized = Regex.Replace(normalized, @"\s{2,}", " ").Trim();

            return string.IsNullOrWhiteSpace(normalized) ? "BANK TRANSACTION" : normalized;
        }

        /// <summary>
        /// Extracts the leading merchant token (first 1–3 meaningful words) from a normalized narration.
        /// </summary>
        public string? ExtractMerchant(string normalizedNarration)
        {
            if (string.IsNullOrWhiteSpace(normalizedNarration)) return null;

            var tokens = normalizedNarration.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (tokens.Length == 0) return null;

            var meaningful = new List<string>();
            foreach (var token in tokens)
            {
                if (token.Length < 3) continue;
                meaningful.Add(token);
                if (meaningful.Count >= 2) break;
            }

            return meaningful.Count > 0 ? string.Join(" ", meaningful) : null;
        }

        /// <summary>
        /// Evaluates active rules (already sorted by Priority ASC) against a single import.
        /// Returns the first matching rule, or null if no match.
        /// Credits only match rules that have AutoPostCredits = true.
        /// </summary>
        public BankCategorizationRule? FindMatch(
            BankImportedTransaction import,
            IReadOnlyList<BankCategorizationRule> activeRulesSortedByPriority)
        {
            // Credits require explicit opt-in per rule
            var isCredit = import.Direction == "credit";

            var narration = import.NormalizedNarration ?? import.RawNarration;
            if (string.IsNullOrWhiteSpace(narration)) return null;

            foreach (var rule in activeRulesSortedByPriority)
            {
                if (isCredit && !rule.AutoPostCredits)
                    continue;

                bool matched;
                try
                {
                    if (rule.IsRegex)
                    {
                        var opts = rule.CaseSensitive
                            ? RegexOptions.None
                            : RegexOptions.IgnoreCase;
                        matched = Regex.IsMatch(narration, rule.MatchText, opts);
                    }
                    else
                    {
                        var comparison = rule.CaseSensitive
                            ? StringComparison.Ordinal
                            : StringComparison.OrdinalIgnoreCase;
                        matched = narration.Contains(rule.MatchText, comparison);
                    }
                }
                catch (ArgumentException)
                {
                    // Malformed regex pattern — skip rule
                    continue;
                }

                if (matched)
                    return rule;
            }

            return null;
        }
    }
}
