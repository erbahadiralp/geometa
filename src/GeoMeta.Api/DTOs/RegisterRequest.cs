using System.ComponentModel.DataAnnotations;

namespace GeoMeta.Api.DTOs;

public class RegisterRequest
{
    [Required, MinLength(3), MaxLength(50)]
    public string Username { get; set; } = "";

    [Required, MinLength(6), MaxLength(100)]
    public string Password { get; set; } = "";
}
