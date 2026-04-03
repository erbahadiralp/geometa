using GeoMeta.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoMeta.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Country> Countries => Set<Country>();
    public DbSet<CountryTag> CountryTags => Set<CountryTag>();
    public DbSet<Card> Cards => Set<Card>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Country>(e =>
        {
            e.HasIndex(c => c.Name).IsUnique();
        });

        modelBuilder.Entity<CountryTag>(e =>
        {
            e.HasIndex(t => t.CountryId);
        });

        modelBuilder.Entity<Card>(e =>
        {
            e.HasIndex(c => c.CountryId);
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
        });
    }
}
