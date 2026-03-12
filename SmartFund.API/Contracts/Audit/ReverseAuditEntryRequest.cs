using System.ComponentModel.DataAnnotations;

namespace SmartFund.API.Contracts.Audit
{
    public sealed class ReverseAuditEntryRequest
    {
        [Required]
        public string Pin { get; set; } = default!;
    }
}
