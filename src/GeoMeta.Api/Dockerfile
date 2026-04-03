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
