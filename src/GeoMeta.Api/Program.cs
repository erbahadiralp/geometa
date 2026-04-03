using System.Text;
using GeoMeta.Api.Data;
using GeoMeta.Api.Hubs;
using GeoMeta.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- Services ---

// 1. Database
var connectionString = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=geometa;Username=geo;Password=secretdb";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrEmpty(jwtSecret))
    jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
if (string.IsNullOrEmpty(jwtSecret))
    jwtSecret = "dev-super-secret-key-that-is-at-least-32-characters-long!!";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "GeoMeta",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "GeoMetaClient",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };

        // SignalR JWT support: read token from query string
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

// 3. Authorization
builder.Services.AddAuthorization();

// 4. SignalR
builder.Services.AddSignalR();

// 5. CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "https://geometa.bahadiralper.com",
                "http://localhost:5000",
                "http://localhost:8095",
                "http://localhost:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });

    // Development: allow all
    options.AddPolicy("Development", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// 6. Controllers
builder.Services.AddControllers();

// 7. Custom services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<IImageService, ImageService>();

var app = builder.Build();

// --- Middleware Pipeline ---

// Static files: wwwroot
app.UseStaticFiles();

// Static files: /uploads
var uploadPath = Environment.GetEnvironmentVariable("UPLOAD_PATH")
    ?? builder.Configuration["Upload:Path"]
    ?? Path.Combine(app.Environment.ContentRootPath, "uploads");

if (!Directory.Exists(uploadPath))
    Directory.CreateDirectory(uploadPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadPath),
    RequestPath = "/uploads"
});

// CORS
if (app.Environment.IsDevelopment())
    app.UseCors("Development");
else
    app.UseCors();

// Auth
app.UseAuthentication();
app.UseAuthorization();

// Routes
app.MapControllers();
app.MapHub<GeoMetaHub>("/hub/geometa");

// SPA fallback
app.MapFallbackToFile("index.html");

// --- Startup Tasks ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.Run();
