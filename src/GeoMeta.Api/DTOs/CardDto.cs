namespace GeoMeta.Api.DTOs;

public class CardDto
{
    public int Id { get; set; }
    public int CountryId { get; set; }
    public string Category { get; set; } = "";
    public string Text { get; set; } = "";
    public string? ImagePath { get; set; }
    public string Author { get; set; } = "";
    public bool IsPinned { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
