using GeoMeta.Api.Data;
using GeoMeta.Api.DTOs;
using GeoMeta.Api.Hubs;
using GeoMeta.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace GeoMeta.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CountriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<GeoMetaHub> _hub;

    public CountriesController(AppDbContext db, IHubContext<GeoMetaHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var countries = await _db.Countries
            .Include(c => c.Tags)
            .Include(c => c.Cards)
            .OrderBy(c => c.Name)
            .Select(c => new CountryDto
            {
                Id = c.Id,
                Name = c.Name,
                Flag = c.Flag,
                IsoNumeric = c.IsoNumeric,
                Continent = c.Continent,
                Tags = c.Tags.Select(t => new CountryTagDto
                {
                    Id = t.Id,
                    Label = t.Label,
                    Color = t.Color
                }).ToList(),
                CardCount = c.Cards.Count
            })
            .ToListAsync();

        return Ok(countries);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCountryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var exists = await _db.Countries.AnyAsync(c => c.Name == request.Name);
        if (exists)
            return Conflict(new { message = "Bu ülke zaten eklenmiş." });

        var country = new Country
        {
            Name = request.Name,
            Flag = request.Flag,
            IsoNumeric = request.IsoNumeric,
            Continent = request.Continent,
            Tags = request.Tags.Select(t => new CountryTag
            {
                Label = t.Label,
                Color = t.Color
            }).ToList()
        };

        _db.Countries.Add(country);
        await _db.SaveChangesAsync();

        var dto = new CountryDto
        {
            Id = country.Id,
            Name = country.Name,
            Flag = country.Flag,
            IsoNumeric = country.IsoNumeric,
            Continent = country.Continent,
            Tags = country.Tags.Select(t => new CountryTagDto
            {
                Id = t.Id,
                Label = t.Label,
                Color = t.Color
            }).ToList(),
            CardCount = 0
        };

        await _hub.Clients.All.SendAsync("CountryAdded", dto);

        return CreatedAtAction(nameof(GetById), new { id = country.Id }, dto);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var country = await _db.Countries
            .Include(c => c.Tags)
            .Include(c => c.Cards)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (country == null)
            return NotFound();

        var dto = new CountryDto
        {
            Id = country.Id,
            Name = country.Name,
            Flag = country.Flag,
            IsoNumeric = country.IsoNumeric,
            Continent = country.Continent,
            Tags = country.Tags.Select(t => new CountryTagDto
            {
                Id = t.Id,
                Label = t.Label,
                Color = t.Color
            }).ToList(),
            CardCount = country.Cards.Count
        };

        return Ok(dto);
    }

    [HttpPut("{id}/tags")]
    public async Task<IActionResult> UpdateTags(int id, [FromBody] List<CreateCountryTagRequest> tags)
    {
        var country = await _db.Countries
            .Include(c => c.Tags)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (country == null) return NotFound();

        // Remove old tags
        _db.CountryTags.RemoveRange(country.Tags);

        // Add new tags
        country.Tags = tags.Select(t => new CountryTag
        {
            Label = t.Label,
            Color = t.Color,
            CountryId = id
        }).ToList();

        await _db.SaveChangesAsync();

        var dto = new CountryDto
        {
            Id = country.Id,
            Name = country.Name,
            Flag = country.Flag,
            IsoNumeric = country.IsoNumeric,
            Continent = country.Continent,
            Tags = country.Tags.Select(t => new CountryTagDto
            {
                Id = t.Id,
                Label = t.Label,
                Color = t.Color
            }).ToList(),
            CardCount = await _db.Cards.CountAsync(c => c.CountryId == id)
        };

        await _hub.Clients.All.SendAsync("CountryUpdated", dto);

        return Ok(dto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var country = await _db.Countries.FindAsync(id);
        if (country == null)
            return NotFound();

        _db.Countries.Remove(country);
        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("CountryDeleted", new { countryId = id });

        return NoContent();
    }
}
