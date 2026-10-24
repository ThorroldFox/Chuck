# =========================================================
# STAGE 1: Build the React Frontend
# =========================================================
FROM node:24-alpine AS build-frontend
WORKDIR /app/frontend

# Copy package files first to leverage Docker layer caching
COPY UI/Chuck.UI/package*.json ./
RUN npm install

# Copy the rest of the React source code and build it via Vite
COPY UI/Chuck.UI/ ./
RUN npm run build

# =========================================================
# STAGE 2: Build the .NET Backend
# =========================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build-backend
WORKDIR /app/backend

# Copy the project file and restore NuGet packages
COPY API/Chuck.API/Chuck.API.csproj ./
RUN dotnet restore

# Copy the rest of the C# source code
COPY API/Chuck.API/ ./

# CRITICAL STEP: We copy the compiled React app from Stage 1 
# directly into the .NET API's wwwroot folder!
COPY --from=build-frontend /app/frontend/dist ./wwwroot

# Publish the .NET application (Release mode)
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# =========================================================
# STAGE 3: Final Runtime Image (The lightweight container)
# =========================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080

# Install curl for container health monitoring
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy the published app (which now includes the wwwroot folder) from Stage 2
COPY --from=build-backend /app/publish .

# Create the data directory inside the container for our file drops
RUN mkdir -p /app/app_data/drops

# Override the appsettings so it uses the Docker directory instead of a local debug path
ENV ChuckSettings__DiskStoragePath="/app/app_data/drops"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "Chuck.API.dll"]
