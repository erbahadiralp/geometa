using GeoMeta.Api.Data;
using GeoMeta.Api.Hubs;
using GeoMeta.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace GeoMeta.Api.Controllers;

[ApiController]
[Authorize]
public class ImagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IImageService _imageService;
    private readonly IHubContext<GeoMetaHub> _hub;

    public ImagesController(AppDbContext db, IImageService imageService, IHubContext<GeoMetaHub> hub)
    {
        _db = db;
        _imageService = imageService;
        _hub = hub;
    }

    [HttpPost("api/cards/{id}/image")]
    public async Task<IActionResult> UploadImage(int id, IFormFile image)
    {
        var card = await _db.Cards.FindAsync(id);
        if (card == null) return NotFound();

        try
        {
            // Delete old image if exists
            if (!string.IsNullOrEmpty(card.ImagePath))
                _imageService.DeleteImage(card.ImagePath);

            var imagePath = await _imageService.SaveImageAsync(image, id);
            card.ImagePath = imagePath;
            card.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await _hub.Clients.All.SendAsync("CardImageUpdated", new
            {
                cardId = id,
                countryId = card.CountryId,
                imagePath
            });

            return Ok(new { imagePath });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("api/cards/{id}/image")]
    public async Task<IActionResult> DeleteImage(int id)
    {
        var card = await _db.Cards.FindAsync(id);
        if (card == null) return NotFound();

        if (!string.IsNullOrEmpty(card.ImagePath))
        {
            _imageService.DeleteImage(card.ImagePath);
            card.ImagePath = null;
            card.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await _hub.Clients.All.SendAsync("CardImageUpdated", new
            {
                cardId = id,
                countryId = card.CountryId,
                imagePath = (string?)null
            });
        }

        return NoContent();
    }
}
