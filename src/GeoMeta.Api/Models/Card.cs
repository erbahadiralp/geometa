using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoMeta.Api.Models;

[Table("Cards")]
public class Card
{
    public int Id { get; set; }

    public int CountryId { get; set; }

    [Required, MaxLength(50)]
    public string Category { get; set; } = "";

    public string Text { get; set; } = "";

    [MaxLength(255)]
    public string? ImagePath { get; set; }

    [Required, MaxLength(50)]
    public string Author { get; set; } = "";

    public bool IsPinned { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CountryId))]
    public Country Country { get; set; } = null!;
}
