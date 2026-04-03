using GeoMeta.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoMeta.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Güvenlik çemberi. Kullanıcı rolü check edilecek.
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    private async Task<bool> IsAdmin()
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrEmpty(username)) return false;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username);
        return user != null && user.Role == "Admin";
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        if (!await IsAdmin()) return Forbid();

        var users = await _db.Users
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.IsApproved,
                u.Role
            })
            .OrderBy(u => u.IsApproved)
            .ThenByDescending(u => u.Id)
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost("users/{id}/approve")]
    public async Task<IActionResult> ApproveUser(int id)
    {
        if (!await IsAdmin()) return Forbid();

        var targetUser = await _db.Users.FindAsync(id);
        if (targetUser == null) return NotFound("Kullanıcı bulunamadı.");

        targetUser.IsApproved = true;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Kullanıcı başarıyla onaylandı." });
    }
}
