# syntax=docker/dockerfile:1.7
# Multi-stage build for the SmartFund.API service (.NET 10).
# The React SPA is built and served by a separate `web` container (see SmartFund.Web/Dockerfile).

# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files first so `restore` can be cached when source changes but deps don't.
COPY SmartFund.API/SmartFund.API.csproj             SmartFund.API/
COPY SmartFund.Application/SmartFund.Application.csproj SmartFund.Application/
COPY SmartFund.Domain/SmartFund.Domain.csproj       SmartFund.Domain/
COPY SmartFund.Infrastructure/SmartFund.Infrastructure.csproj SmartFund.Infrastructure/
COPY SmartFund.Persistence/SmartFund.Persistence.csproj SmartFund.Persistence/

RUN dotnet restore SmartFund.API/SmartFund.API.csproj

# Copy the rest of the source and publish a self-contained build.
COPY SmartFund.API/             SmartFund.API/
COPY SmartFund.Application/     SmartFund.Application/
COPY SmartFund.Domain/          SmartFund.Domain/
COPY SmartFund.Infrastructure/  SmartFund.Infrastructure/
COPY SmartFund.Persistence/     SmartFund.Persistence/

RUN dotnet publish SmartFund.API/SmartFund.API.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# curl is used by the docker-compose healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 8080

ENTRYPOINT ["dotnet", "SmartFund.API.dll"]
