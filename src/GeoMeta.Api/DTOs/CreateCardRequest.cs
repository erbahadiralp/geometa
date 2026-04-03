using System.ComponentModel.DataAnnotations;

namespace GeoMeta.Api.DTOs;

public class CreateCardRequest
{
    [Required, MaxLength(50)]
    public string Category { get; set; } = "";

    public string Text { get; set; } = "";
}
