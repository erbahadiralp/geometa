using GeoMeta.Api.Data;
using GeoMeta.Api.DTOs;
using GeoMeta.Api.Hubs;
using GeoMeta.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GeoMeta.Api.Controllers;

[ApiController]
[Authorize]
public class CardsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<GeoMetaHub> _hub;

    public CardsController(AppDbContext db, IHubContext<GeoMetaHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    private string GetUsername() =>
        User.FindFirstValue(ClaimTypes.Name) ?? "unknown";

    private CardDto ToDto(Card card) => new()
    {
        Id = card.Id,
        CountryId = card.CountryId,
        Category = card.Category,
        Text = card.Text,
        ImagePath = card.ImagePath,
        Author = card.Author,
        IsPinned = card.IsPinned,
        CreatedAt = card.CreatedAt,
        UpdatedAt = card.UpdatedAt
    };

    [HttpGet("api/countries/{countryId}/cards")]
    public async Task<IActionResult> GetByCountry(int countryId)
    {
        var exists = await _db.Countries.AnyAsync(c => c.Id == countryId);
        if (!exists) return NotFound();

        var cards = await _db.Cards
            .Where(c => c.CountryId == countryId)
            .OrderByDescending(c => c.IsPinned)
            .ThenBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(cards.Select(ToDto));
    }

    [HttpPost("api/countries/{countryId}/cards")]
    public async Task<IActionResult> Create(int countryId, [FromBody] CreateCardRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var country = await _db.Countries.FindAsync(countryId);
        if (country == null) return NotFound();

        var card = new Card
        {
            CountryId = countryId,
            Category = request.Category,
            Text = request.Text,
            Author = GetUsername()
        };

        _db.Cards.Add(card);
        await _db.SaveChangesAsync();

        var dto = ToDto(card);
        await _hub.Clients.All.SendAsync("CardAdded", new { countryId, card = dto });

        return Created($"/api/countries/{countryId}/cards", dto);
    }

    [HttpPut("api/cards/{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCardRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var card = await _db.Cards.FindAsync(id);
        if (card == null) return NotFound();

        var currentUser = GetUsername();
        if (card.Author != currentUser)
            return StatusCode(403, new { message = "Sadece kendi notunuzu düzenleyebilirsiniz." });

        card.Category = request.Category;
        card.Text = request.Text;
        card.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var dto = ToDto(card);
        await _hub.Clients.All.SendAsync("CardUpdated", dto);

        return Ok(dto);
    }

    [HttpPut("api/cards/{id}/pin")]
    public async Task<IActionResult> TogglePin(int id)
    {
        var card = await _db.Cards.FindAsync(id);
        if (card == null) return NotFound();

        card.IsPinned = !card.IsPinned;
        card.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var dto = ToDto(card);
        await _hub.Clients.All.SendAsync("CardUpdated", dto);

        return Ok(dto);
    }

    [HttpDelete("api/cards/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var card = await _db.Cards.FindAsync(id);
        if (card == null) return NotFound();

        var currentUser = GetUsername();
        if (card.Author != currentUser)
            return StatusCode(403, new { message = "Sadece kendi notunuzu silebilirsiniz." });

        var countryId = card.CountryId;
        _db.Cards.Remove(card);
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("CardDeleted", new { cardId = id, countryId });

        return NoContent();
    }
}
