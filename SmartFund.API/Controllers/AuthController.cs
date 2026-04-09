using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartFund.Application.Services;
using SmartFund.Domain.Enums;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public sealed class AuthController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly UserAuthService _authService;

        public AuthController(IConfiguration config, UserAuthService authService)
        {
            _config = config;
            _authService = authService;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                return BadRequest(new { error = "Full name is required." });
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(new { error = "Email is required." });
            if (string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Password is required." });

            var user = await _authService.RegisterAsync(request.FullName, request.Email, request.Password, ct);

            return StatusCode(201, new
            {
                userId = user.Id,
                email = user.Email,
                fullName = user.FullName,
                role = user.Role.ToString()
            });
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
        {
            var issuer = _config["Jwt:Issuer"];
            var audience = _config["Jwt:Audience"];
            var key = _config["Jwt:Key"];
            var expiresMinutes = int.TryParse(_config["Jwt:ExpiresMinutes"], out var mins) ? mins : 480;

            if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience) || string.IsNullOrWhiteSpace(key))
                return StatusCode(500, "JWT settings are not configured.");

            // Determine if this is an email-based login
            var input = request.Email?.Trim() ?? request.Username?.Trim() ?? string.Empty;
            bool isEmailLogin = input.Contains('@');

            Claim[] claims;

            if (isEmailLogin)
            {
                // DB-backed authentication
                var user = await _authService.AuthenticateAsync(input, request.Password ?? string.Empty, ct);
                if (user is null)
                    return Unauthorized(new { error = "Invalid email or password." });

                claims =
                [
                    new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.FullName),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role.ToString())
                ];
            }
            else
            {
                // Legacy config-based admin login (backward compatibility)
                var expectedUser = _config["Auth:Username"];
                var expectedPass = _config["Auth:Password"];

                if (string.IsNullOrWhiteSpace(expectedUser) || string.IsNullOrWhiteSpace(expectedPass))
                    return StatusCode(500, "Auth credentials are not configured.");

                if (!string.Equals(input, expectedUser, StringComparison.Ordinal) ||
                    !string.Equals(request.Password, expectedPass, StringComparison.Ordinal))
                    return Unauthorized(new { error = "Invalid username or password." });

                claims =
                [
                    new Claim(JwtRegisteredClaimNames.Sub, expectedUser),
                    new Claim(ClaimTypes.Name, expectedUser),
                    new Claim(ClaimTypes.NameIdentifier, "1"),
                    new Claim(ClaimTypes.Role, UserRole.Admin.ToString())
                ];
            }

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
            var now = DateTime.UtcNow;

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                notBefore: now,
                expires: now.AddMinutes(expiresMinutes),
                signingCredentials: creds);

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);

            return Ok(new { token = jwt, expiresAtUtc = token.ValidTo });
        }
    }

    public sealed class LoginRequest
    {
        public string? Username { get; set; }
        public string? Email { get; set; }
        public string? Password { get; set; }
    }

    public sealed class RegisterRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
