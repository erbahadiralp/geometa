namespace GeoMeta.Api.DTOs;

public class CountryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Flag { get; set; } = "";
    public int? IsoNumeric { get; set; }
    public string Continent { get; set; } = "";
    public List<CountryTagDto> Tags { get; set; } = new();
    public int CardCount { get; set; }
}

public class CountryTagDto
{
    public int Id { get; set; }
    public string Label { get; set; } = "";
    public string Color { get; set; } = "default";
}
