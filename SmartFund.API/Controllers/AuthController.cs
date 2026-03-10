using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public sealed class AuthController : ControllerBase
    {
        private readonly IConfiguration _config;

        public AuthController(IConfiguration config) => _config = config;

        [AllowAnonymous]
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            var expectedUser = _config["Auth:Username"];
            var expectedPass = _config["Auth:Password"];

            if (string.IsNullOrWhiteSpace(expectedUser) || string.IsNullOrWhiteSpace(expectedPass))
                return StatusCode(500, "Auth credentials are not configured.");

            if (!string.Equals(request.Username?.Trim(), expectedUser, StringComparison.Ordinal) ||
                !string.Equals(request.Password, expectedPass, StringComparison.Ordinal))
                return Unauthorized("Invalid username or password.");

            var issuer = _config["Jwt:Issuer"];
            var audience = _config["Jwt:Audience"];
            var key = _config["Jwt:Key"];
            var expiresMinutes = int.TryParse(_config["Jwt:ExpiresMinutes"], out var mins) ? mins : 480;

            if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience) || string.IsNullOrWhiteSpace(key))
                return StatusCode(500, "JWT settings are not configured.");

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

            // NOTE: SmartFund currently accepts explicit user ids in requests (e.g. ReceivedByUserId).
            // This token is only used to protect endpoints and identify the caller.
            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, expectedUser),
                new Claim(ClaimTypes.Name, expectedUser),
                new Claim(ClaimTypes.NameIdentifier, "1")
            };

            var now = DateTime.UtcNow;

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                notBefore: now,
                expires: now.AddMinutes(expiresMinutes),
                signingCredentials: creds);

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            return Ok(new
            {
                token = jwt,
                expiresAtUtc = token.ValidTo
            });
        }

        public sealed class LoginRequest
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }
    }
}
