using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoMeta.Api.Models;

[Table("CountryTags")]
public class CountryTag
{
    public int Id { get; set; }

    public int CountryId { get; set; }

    [Required, MaxLength(100)]
    public string Label { get; set; } = "";

    [MaxLength(20)]
    public string Color { get; set; } = "default";

    [ForeignKey(nameof(CountryId))]
    public Country Country { get; set; } = null!;
}
