using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoMeta.Api.Models;

[Table("Countries")]
public class Country
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = "";

    [Required, MaxLength(10)]
    public string Flag { get; set; } = "";

    public int? IsoNumeric { get; set; }

    [Required, MaxLength(50)]
    public string Continent { get; set; } = "";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CountryTag> Tags { get; set; } = new List<CountryTag>();
    public ICollection<Card> Cards { get; set; } = new List<Card>();
}
