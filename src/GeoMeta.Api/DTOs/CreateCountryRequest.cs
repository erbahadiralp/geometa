using System.ComponentModel.DataAnnotations;

namespace GeoMeta.Api.DTOs;

public class CreateCountryRequest
{
    [Required, MaxLength(100)]
    public string Name { get; set; } = "";

    [Required, MaxLength(10)]
    public string Flag { get; set; } = "";

    public int? IsoNumeric { get; set; }

    [Required, MaxLength(50)]
    public string Continent { get; set; } = "";

    public List<CreateCountryTagRequest> Tags { get; set; } = new();
}

public class CreateCountryTagRequest
{
    [Required, MaxLength(100)]
    public string Label { get; set; } = "";

    [MaxLength(20)]
    public string Color { get; set; } = "default";
}
