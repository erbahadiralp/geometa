# GeoMeta — Proje Spesifikasyonu

> İki oyuncunun GeoGuessr oynaması sırasında ülke bazlı meta notları (ipuçları, görseller, kategori kartları) paylaşıp gerçek zamanlı olarak düzenleyebildiği özel bir web uygulaması.

---

## 1. Genel Bakış

### Amaç
GeoMeta, iki oyuncunun GeoGuessr oynarken edindikleri ülke ipuçlarını (araç/plaka tipi, yol işaretleri, bitki örtüsü, dil, mimari vb.) saklamaları ve anlık olarak paylaşabilmeleri için tasarlanmış minimal, hızlı bir notlama uygulamasıdır.

### Temel Özellikler
- Dünya haritası üzerinde tıklanabilir ülkeler (notu olan ülkeler renk ile işaretlenir)
- Ülke başına kategori kartları (metin + fotoğraf)
- Kart bazında fotoğraf yükleme (drag & drop dahil)
- SignalR ile iki kullanıcı arasında gerçek zamanlı senkronizasyon
- Basit iki kullanıcılı kimlik doğrulama (JWT tabanlı)
- Tam responsive, dark-mode UI (vanilla JS + CSS, framework yok)
- Docker ile self-hosted deployment

---

## 2. Tech Stack

| Katman | Teknoloji |
|---|---|
| Backend Framework | ASP.NET Core 8 (Web API) |
| Realtime | SignalR (ASP.NET Core dahili) |
| ORM | Entity Framework Core 8 |
| Veritabanı | PostgreSQL 16 |
| Authentication | JWT Bearer Token |
| Frontend | Vanilla JS + HTML + CSS (wwwroot) |
| Dünya Haritası | D3.js v7 + world-atlas topojson (CDN) |
| Image Storage | Disk (Docker volume mount: `/app/uploads`) |
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx (dış sunucu — projenin dışında) |

---

## 3. Proje Yapısı (Dosya Ağacı)

```
GeoMeta/
├── GeoMeta.sln
├── docker-compose.yml
├── .env.example
│
├── src/
│   └── GeoMeta.Api/
│       ├── GeoMeta.Api.csproj
│       ├── Program.cs
│       ├── appsettings.json
│       ├── appsettings.Development.json
│       ├── Dockerfile
│       │
│       ├── Data/
│       │   ├── AppDbContext.cs
│       │   └── Migrations/               # EF Core otomatik üretir
│       │
│       ├── Models/
│       │   ├── Country.cs
│       │   ├── CountryTag.cs
│       │   ├── Card.cs
│       │   └── User.cs
│       │
│       ├── DTOs/
│       │   ├── CountryDto.cs
│       │   ├── CardDto.cs
│       │   ├── CreateCountryRequest.cs
│       │   ├── CreateCardRequest.cs
│       │   ├── UpdateCardRequest.cs
│       │   └── LoginRequest.cs
│       │
│       ├── Controllers/
│       │   ├── AuthController.cs
│       │   ├── CountriesController.cs
│       │   ├── CardsController.cs
│       │   └── ImagesController.cs
│       │
│       ├── Hubs/
│       │   └── GeoMetaHub.cs
│       │
│       ├── Services/
│       │   ├── ImageService.cs
│       │   └── TokenService.cs
│       │
│       └── wwwroot/
│           ├── index.html
│           ├── css/
│           │   └── app.css
│           └── js/
│               ├── app.js          # Ana uygulama init
│               ├── api.js          # Fetch wrapper
│               ├── auth.js         # Login/token yönetimi
│               ├── map.js          # D3 harita
│               ├── detail.js       # Ülke detay görünümü
│               ├── cards.js        # Kart render & CRUD
│               ├── upload.js       # Görsel yükleme
│               └── realtime.js     # SignalR client
```

---

## 4. Veritabanı Şeması

### `Countries` Tablosu
```sql
CREATE TABLE "Countries" (
    "Id"        SERIAL PRIMARY KEY,
    "Name"      VARCHAR(100) NOT NULL UNIQUE,
    "Flag"      VARCHAR(10)  NOT NULL,        -- Emoji
    "IsoNumeric" INT,                          -- ISO 3166-1 numeric (harita için)
    "Continent" VARCHAR(50)  NOT NULL,
    "CreatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### `CountryTags` Tablosu
```sql
CREATE TABLE "CountryTags" (
    "Id"        SERIAL PRIMARY KEY,
    "CountryId" INT NOT NULL REFERENCES "Countries"("Id") ON DELETE CASCADE,
    "Label"     VARCHAR(100) NOT NULL,
    "Color"     VARCHAR(20)  NOT NULL DEFAULT 'default'  -- 'green' | 'yellow' | 'default'
);
```

### `Cards` Tablosu
```sql
CREATE TABLE "Cards" (
    "Id"         SERIAL PRIMARY KEY,
    "CountryId"  INT          NOT NULL REFERENCES "Countries"("Id") ON DELETE CASCADE,
    "Category"   VARCHAR(50)  NOT NULL,   -- 'Google Car' | 'Bollards' | 'Plaka' | 'Doğa' | 'Dil' | 'Mimari' | 'Trafik' | 'Genel'
    "Text"       TEXT         NOT NULL DEFAULT '',
    "ImagePath"  VARCHAR(255),             -- NULL = görsel yok; değer = /uploads/{filename}
    "Author"     VARCHAR(50)  NOT NULL,    -- kullanıcı adı ('bahadir' | 'arkadaş')
    "CreatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "UpdatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### `Users` Tablosu (runtime-only, seed data)
```sql
-- Kayıt yok, sadece 2 kullanıcı env'den seed edilir
CREATE TABLE "Users" (
    "Id"           SERIAL PRIMARY KEY,
    "Username"     VARCHAR(50) NOT NULL UNIQUE,
    "PasswordHash" VARCHAR(255) NOT NULL
);
```

### EF Core Model Notları
- Tüm entity'lerde `[Table("TableName")]` attribute kullan (PostgreSQL küçük harf sorunlarını önler)
- `AppDbContext.OnModelCreating()` içinde index'leri tanımla:
  - `Countries.Name` üzerinde unique index
  - `Cards.CountryId` üzerinde index
  - `CountryTags.CountryId` üzerinde index

---

## 5. Entity Models

### `Country.cs`
```csharp
public class Country
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Flag { get; set; } = "";
    public int? IsoNumeric { get; set; }
    public string Continent { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<CountryTag> Tags { get; set; } = new List<CountryTag>();
    public ICollection<Card> Cards { get; set; } = new List<Card>();
}
```

### `Card.cs`
```csharp
public class Card
{
    public int Id { get; set; }
    public int CountryId { get; set; }
    public string Category { get; set; } = "";
    public string Text { get; set; } = "";
    public string? ImagePath { get; set; }
    public string Author { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public Country Country { get; set; } = null!;
}
```

---

## 6. API Endpoint'leri

Tüm endpoint'ler (auth hariç) `[Authorize]` gerektirir. Token `Authorization: Bearer <token>` header'ında gönderilir.

### Auth

#### `POST /api/auth/login`
**Request:**
```json
{ "username": "bahadir", "password": "..." }
```
**Response `200`:**
```json
{ "token": "eyJ...", "username": "bahadir", "expiresAt": "2026-05-03T..." }
```
**Response `401`:** Hatalı kimlik bilgisi

---

### Countries

#### `GET /api/countries`
Tüm ülkeleri taglar ve kart sayısı ile döndürür.
```json
[
  {
    "id": 1,
    "name": "Senegal",
    "flag": "🇸🇳",
    "isoNumeric": 686,
    "continent": "Africa",
    "tags": [
      { "id": 1, "label": "Right-hand Drive", "color": "green" }
    ],
    "cardCount": 4
  }
]
```

#### `POST /api/countries`
**Request:**
```json
{
  "name": "Japan",
  "flag": "🇯🇵",
  "isoNumeric": 392,
  "continent": "Asia",
  "tags": [
    { "label": "Left-hand Drive", "color": "green" },
    { "label": "Japanese", "color": "yellow" }
  ]
}
```
**Response `201`:** Oluşturulan ülke objesi  
**SignalR:** `CountryAdded` event yayınlar

#### `GET /api/countries/{id}`
Tek ülkeyi taglar + kartlar ile döndürür.

#### `DELETE /api/countries/{id}`
Ülkeyi ve tüm kartlarını siler (CASCADE). **Response `204`.**  
**SignalR:** `CountryDeleted` event yayınlar

---

### Cards

#### `GET /api/countries/{countryId}/cards`
Ülkenin tüm kartlarını döndürür (createdAt asc).

#### `POST /api/countries/{countryId}/cards`
**Request:**
```json
{
  "category": "Google Car",
  "text": "Distinctive roof rack with duct tape."
}
```
**Response `201`:** Oluşturulan kart objesi  
**SignalR:** `CardAdded` event yayınlar (tüm hub client'larına)

#### `PUT /api/cards/{id}`
Kartın text veya category alanını günceller.
**Request:**
```json
{ "category": "Google Car", "text": "Güncellenmiş metin." }
```
**Response `200`:** Güncellenmiş kart  
**SignalR:** `CardUpdated` event yayınlar

#### `DELETE /api/cards/{id}`
**Response `204`.**  
**SignalR:** `CardDeleted` event yayınlar

---

### Images

#### `POST /api/cards/{id}/image`
`multipart/form-data` ile tek görsel kabul eder. Field adı: `image`.
- Maksimum boyut: **5 MB**
- Kabul edilen tipler: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Dosya adı: `{cardId}_{timestamp}{ext}` formatında oluşturulur
- Kayıt yeri: `/app/uploads/` (Docker volume)

**Response `200`:**
```json
{ "imagePath": "/uploads/42_1743690000.jpg" }
```
**SignalR:** `CardImageUpdated` event yayınlar

#### `DELETE /api/cards/{id}/image`
Kartın görselini siler (disk + DB). **Response `204`.**

#### `GET /uploads/{filename}` (static file)
ASP.NET Core static file middleware tarafından serve edilir. Auth gerekmez (URL tahmin edilemez).

---

## 7. SignalR Hub

### Hub Sınıfı: `GeoMetaHub.cs`
- Route: `/hub/geometa`
- Hub metotlarına JWT auth gerekir (`[Authorize]`)
- Tüm client'lar tek bir gruba dahil edilmez; broadcast `Clients.All` ile yapılır

### Server → Client Eventler

| Event Adı | Payload | Tetikleyici |
|---|---|---|
| `CountryAdded` | `CountryDto` | POST /api/countries |
| `CountryDeleted` | `{ countryId: int }` | DELETE /api/countries/{id} |
| `CardAdded` | `{ countryId: int, card: CardDto }` | POST /api/countries/{countryId}/cards |
| `CardUpdated` | `CardDto` | PUT /api/cards/{id} |
| `CardDeleted` | `{ cardId: int, countryId: int }` | DELETE /api/cards/{id} |
| `CardImageUpdated` | `{ cardId: int, countryId: int, imagePath: string }` | POST /api/cards/{id}/image |

### Client → Server Metotlar
Opsiyonel; şu an için sadece join bildirimi:
```
JoinSession(username: string) → void
```

---

## 8. Authentication

### Yapı
- İki kullanıcı sabit: `bahadir` ve `ortak` (isimlendirme değiştirilebilir)
- Şifreler env variable'lardan okunur: `AUTH_USER1_PASS`, `AUTH_USER2_PASS`
- Uygulama başlarken `Users` tablosu bu iki kullanıcıyla seed edilir (zaten varsa atlar)
- BCrypt ile hash
- JWT: 30 günlük expiry, RS256 veya HS256 (simmetrik key env'den)

### `TokenService.cs`
```csharp
public interface ITokenService
{
    string GenerateToken(string username);
}
```

### Env Variables (`.env` dosyası)
```env
POSTGRES_CONNECTION=Host=db;Port=5432;Database=geometa;Username=geo;Password=secretdb
JWT_SECRET=your-very-long-random-secret-key-here
AUTH_USER1_NAME=bahadir
AUTH_USER1_PASS=password1here
AUTH_USER2_NAME=ortak
AUTH_USER2_PASS=password2here
UPLOAD_PATH=/app/uploads
MAX_UPLOAD_BYTES=5242880
```

---

## 9. Program.cs Yapılandırması

`Program.cs` içinde sırayla şunlar yapılmalı:

1. `AddDbContext<AppDbContext>` (Npgsql)
2. `AddAuthentication().AddJwtBearer(...)` (env'den secret oku)
3. `AddAuthorization()`
4. `AddSignalR()`
5. `AddCors()` — development'ta any origin, production'da sadece subdomain
6. Controller'ları kaydet
7. Static files (`/uploads` ve `wwwroot`)
8. Middleware pipeline:
   - `UseStaticFiles()` (`wwwroot` için)
   - `UseStaticFiles(new StaticFileOptions { ... })` (`/app/uploads` için `/uploads` path'i ile)
   - `UseCors()`
   - `UseAuthentication()` + `UseAuthorization()`
   - `MapControllers()`
   - `MapHub<GeoMetaHub>("/hub/geometa")`
   - `MapFallbackToFile("index.html")` (SPA fallback)
9. Startup'ta:
   - `db.Database.MigrateAsync()` çalıştır
   - Seed users

---

## 10. Frontend — Sayfa Yapısı

Tek HTML dosyası (`index.html`), JavaScript ile iki view arasında geçiş yapar. Framework yok.

### View 1 — Login
Sayfa açıldığında `localStorage`'da token yoksa gösterilir. Kullanıcı adı + şifre formu, `POST /api/auth/login` çağırır, token'ı `localStorage.setItem('geo_token', ...)` ile saklar, ardından map view'a geçer.

### View 2 — Harita (Map View)
- Üst bar: Logo | Arama kutusu | Sync göstergesi | Kullanıcı adı + çıkış
- Sol sidebar: Kıta klasörleri → ülkeler (collapse/expand)
- Ana alan: D3.js NaturalEarth projeksiyonlu SVG dünya haritası
  - Notu olan ülkeler: `#4ade80` (yeşil)
  - Boş ülkeler: `#2a2a2e` (koyu gri)
  - Hover tooltip: ülke adı + not sayısı
  - Tıklama: detail view'a geçiş
- Alt: "+ Ülke ekle" butonu (modal açar)

### View 3 — Ülke Detay (Detail View)
- Üst başlık: Bayrak emoji + ülke adı + tag pill'leri + "← Haritaya dön" butonu
- Grid: `repeat(auto-fill, minmax(200px, 1fr))` kart grid'i
  - Her kart: görsel alanı (hover'da upload overlay), kategori label, metin, kim yazdı
  - Kart altı: inline not ekleme input'u
- Alt bar: Kategori seçici + metin input + "Ekle" butonu (yeni kart)

### Kart Görsel Upload
- Kart görsel alanına tıklandığında `<input type="file">` tetiklenir
- Aynı alana dosya drag & drop da çalışır
- `FormData` ile `POST /api/cards/{id}/image` gönderilir
- Başarılıda kart güncellenir, SignalR ile diğer kullanıcıya da yansır

### SignalR Client Davranışı (`realtime.js`)
- Bağlantı kurulunca sol sidebar ve haritadaki kart sayıları canlı güncellenir
- Aktif ülke detayı açıkken gelen `CardAdded` / `CardUpdated` / `CardDeleted` event'leri anında DOM'a yansır
- Bağlantı kopunca 3 saniyede bir yeniden bağlanmayı dener
- Header'da "● Bağlı" / "● Bağlantı kesildi" durumu gösterilir

---

## 11. Dockerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/GeoMeta.Api/GeoMeta.Api.csproj", "src/GeoMeta.Api/"]
RUN dotnet restore "src/GeoMeta.Api/GeoMeta.Api.csproj"
COPY . .
WORKDIR "/src/src/GeoMeta.Api"
RUN dotnet publish "GeoMeta.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "GeoMeta.Api.dll"]
```

---

## 12. Docker Compose

```yaml
version: '3.9'

services:
  api:
    build:
      context: .
      dockerfile: src/GeoMeta.Api/Dockerfile
    container_name: geometa_api
    restart: unless-stopped
    ports:
      - "8095:8080"          # Dış port: nginx reverse proxy için
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - geometa_uploads:/app/uploads

  db:
    image: postgres:16-alpine
    container_name: geometa_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: geometa
      POSTGRES_USER: geo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - geometa_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U geo -d geometa"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  geometa_uploads:
  geometa_pgdata:
```

> **Not:** `POSTGRES_PASSWORD` `.env` dosyasından gelir. Dış porta bağlı Nginx, `geometa.bahadiralper.com`'u `localhost:8095`'e proxy'ler.

---

## 13. appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Jwt": {
    "Secret": "",
    "Issuer": "GeoMeta",
    "Audience": "GeoMetaClient",
    "ExpiryDays": 30
  },
  "Upload": {
    "Path": "/app/uploads",
    "MaxBytes": 5242880
  }
}
```

Hassas değerler (`Jwt:Secret`, connection string, kullanıcı şifreleri) production'da `.env` dosyasından env variable olarak gelir, `appsettings.json`'a yazılmaz.

---

## 14. Geliştirme Sırası (Build Checklist)

### Faz 1 — Backend iskelet
- [ ] Solution + proje oluştur (`dotnet new webapi`)
- [ ] NuGet paketleri ekle:
  - `Npgsql.EntityFrameworkCore.PostgreSQL`
  - `Microsoft.AspNetCore.Authentication.JwtBearer`
  - `Microsoft.AspNetCore.SignalR`
  - `BCrypt.Net-Next`
  - `Microsoft.EntityFrameworkCore.Design`
- [ ] Entity model'leri yaz
- [ ] `AppDbContext` yaz
- [ ] `appsettings.json` yapılandır
- [ ] `Program.cs` kurulumu tamamla
- [ ] İlk migration oluştur (`dotnet ef migrations add Init`)
- [ ] Seed metodu yaz (2 kullanıcı)

### Faz 2 — Auth
- [ ] `TokenService` yaz
- [ ] `AuthController` yaz (`/api/auth/login`)
- [ ] Endpoint'i test et (Postman / .http file)

### Faz 3 — CRUD API'leri
- [ ] `CountriesController` yaz (GET all, POST, GET by id, DELETE)
- [ ] `CardsController` yaz (GET, POST, PUT, DELETE)
- [ ] `ImagesController` yaz (POST image, DELETE image, static file serve)
- [ ] `ImageService` yaz (dosya kaydet / sil)

### Faz 4 — SignalR
- [ ] `GeoMetaHub` sınıfını yaz
- [ ] Controller'lara `IHubContext<GeoMetaHub>` inject et
- [ ] Her veri değişikliğinde ilgili event'i fırlat
- [ ] Frontend SignalR client'ı entegre et

### Faz 5 — Frontend
- [ ] `index.html` ve temel CSS yaz (dark theme, CSS variables)
- [ ] `auth.js` — login akışı, token saklama, otomatik yönlendirme
- [ ] `api.js` — token'lı fetch wrapper, 401 otomatik logout
- [ ] `map.js` — D3 harita, ülke renklendirme, hover, tıklama
- [ ] `detail.js` — ülke detay view geçişleri
- [ ] `cards.js` — kart CRUD, DOM güncelleme
- [ ] `upload.js` — file input, drag & drop, FormData upload
- [ ] `realtime.js` — SignalR bağlantı, event handler'lar
- [ ] Sol sidebar render (kıtalar, ülkeler, collapse)
- [ ] Arama özelliği (sidebar + kart text'leri üzerinde client-side filter)

### Faz 6 — Docker & Test
- [ ] `Dockerfile` yaz
- [ ] `docker-compose.yml` yaz
- [ ] `.env.example` yaz
- [ ] `docker compose up --build` ile local test
- [ ] İki tarayıcı sekmesinde aynı anda açıp SignalR sync'i doğrula
- [ ] Görsel yükleme uçtan uca test et

---

## 15. Güvenlik Notları

- Tüm API endpoint'leri `[Authorize]` ile korunur (`/api/auth/login` ve static files hariç)
- CORS sadece `geometa.bahadiralper.com` ve `localhost:*` için açılır
- Yüklenen görseller için MIME type kontrolü yapılır (sadece image/* kabul)
- Dosya adları kullanıcı girdisine göre oluşturulmaz; sunucu tarafında rastgele isimlendirilir
- PostgreSQL şifresi ve JWT secret production'da güçlü ve eşsiz olmalı

---

## 16. Seed Data (Opsiyonel)

Geliştirme kolaylığı için uygulama başlangıcında aşağıdaki ülkeler eklenebilir (yalnızca DB boşsa):

| İsim | Bayrak | ISO | Kıta |
|---|---|---|---|
| Senegal | 🇸🇳 | 686 | Africa |
| Brazil | 🇧🇷 | 76 | Americas |
| Japan | 🇯🇵 | 392 | Asia |
| Poland | 🇵🇱 | 616 | Europe |
| South Africa | 🇿🇦 | 710 | Africa |
| India | 🇮🇳 | 356 | Asia |

Her ülke için mockup'taki kart içerikleri de seed edilebilir.
