using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoMeta.Api.Models;

[Table("Users")]
public class User
{
    public int Id { get; set; }

    [Required, MaxLength(50)]
    public string Username { get; set; } = "";

    [Required, MaxLength(255)]
    public string PasswordHash { get; set; } = "";

    public bool IsApproved { get; set; } = false;

    [Required, MaxLength(20)]
    public string Role { get; set; } = "User";
}
