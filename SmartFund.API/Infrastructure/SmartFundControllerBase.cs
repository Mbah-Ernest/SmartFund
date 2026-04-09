using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace SmartFund.API.Infrastructure
{
    /// <summary>
    /// Base controller that extracts the current user ID from JWT claims.
    /// Falls back to 1 (admin) for backward compatibility with the legacy config-based login.
    /// </summary>
    public abstract class SmartFundControllerBase : ControllerBase
    {
        protected long GetCurrentUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return long.TryParse(claim, out var id) && id > 0 ? id : 1L;
        }
    }
}
