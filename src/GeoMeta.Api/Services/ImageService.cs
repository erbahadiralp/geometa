namespace GeoMeta.Api.Services;

public interface IImageService
{
    Task<string> SaveImageAsync(IFormFile file, int cardId);
    void DeleteImage(string imagePath);
}

public class ImageService : IImageService
{
    private readonly string _uploadPath;
    private readonly long _maxBytes;
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif"
    };

    public ImageService(IConfiguration config)
    {
        _uploadPath = config["Upload:Path"]
            ?? Environment.GetEnvironmentVariable("UPLOAD_PATH")
            ?? "uploads";
        _maxBytes = long.Parse(config["Upload:MaxBytes"]
            ?? Environment.GetEnvironmentVariable("MAX_UPLOAD_BYTES")
            ?? "5242880");

        if (!Directory.Exists(_uploadPath))
            Directory.CreateDirectory(_uploadPath);
    }

    public async Task<string> SaveImageAsync(IFormFile file, int cardId)
    {
        if (file.Length > _maxBytes)
            throw new InvalidOperationException($"File size exceeds {_maxBytes} bytes limit.");

        if (!AllowedTypes.Contains(file.ContentType))
            throw new InvalidOperationException($"File type '{file.ContentType}' is not allowed.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";

        var fileName = $"{cardId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}{ext}";
        var filePath = Path.Combine(_uploadPath, fileName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"/uploads/{fileName}";
    }

    public void DeleteImage(string imagePath)
    {
        var fileName = Path.GetFileName(imagePath);
        var filePath = Path.Combine(_uploadPath, fileName);

        if (File.Exists(filePath))
            File.Delete(filePath);
    }
}
