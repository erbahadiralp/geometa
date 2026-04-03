using GeoMeta.Api.Data;
using GeoMeta.Api.DTOs;
using GeoMeta.Api.Models;
using GeoMeta.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoMeta.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;

    public AuthController(AppDbContext db, ITokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var exists = await _db.Users.AnyAsync(u => u.Username == request.Username);
        if (exists)
            return Conflict(new { message = "Bu kullanıcı adı zaten alınmış." });

        var isFirstUser = !await _db.Users.AnyAsync();

        var user = new User
        {
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = isFirstUser ? "Admin" : "User",
            IsApproved = isFirstUser // İlk kullanıcı otomatik olarak onaylanıp admin oluyor
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        if (!user.IsApproved)
        {
            return Ok(new { message = "Kayıt başarılı ancak giriş yapabilmek için yönetici onayı bekliyorsunuz." });
        }

        var token = _tokenService.GenerateToken(user.Username);

        return Created("", new
        {
            token,
            username = user.Username,
            expiresAt = DateTime.UtcNow.AddDays(30)
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Geçersiz kullanıcı adı veya şifre." });

        if (!user.IsApproved)
            return Unauthorized(new { message = "Hesabınız şu anda yönetici onayı bekliyor. Lütfen daha sonra tekrar deneyin." });

        var token = _tokenService.GenerateToken(user.Username);

        return Ok(new
        {
            token,
            username = user.Username,
            isAdmin = user.Role == "Admin",
            expiresAt = DateTime.UtcNow.AddDays(30)
        });
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username)) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null) return NotFound();

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Mevcut şifre hatalı." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Şifre başarıyla güncellendi." });
    }
}
