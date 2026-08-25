using Cohestra.Api.Health;
using Cohestra.Api.Infrastructure;
using Cohestra.Infrastructure;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Seed;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

ProductionSecurityValidator.Validate(builder.Configuration, builder.Environment);

var postgresConnection = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(postgresConnection))
{
    throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
}

var redisConnection = builder.Configuration.GetConnectionString("Redis");
if (string.IsNullOrWhiteSpace(redisConnection))
{
    throw new InvalidOperationException("Connection string 'Redis' is not configured.");
}

builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("Jwt configuration is missing.");

if (string.IsNullOrWhiteSpace(jwtSettings.SigningKey) || jwtSettings.SigningKey.Length < 32)
{
    throw new InvalidOperationException("Jwt:SigningKey must be at least 32 characters.");
}

if (jwtSettings.AccessTokenMinutes <= 0)
{
    throw new InvalidOperationException("Jwt:AccessTokenMinutes must be positive.");
}

if (jwtSettings.RefreshTokenHours <= 0)
{
    throw new InvalidOperationException("Jwt:RefreshTokenHours must be positive.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep membership claim type "role" from colliding with Identity RoleClaimType via inbound map.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
            // MapInboundClaims=false → JWT "sub" stays "sub"; Identity roles stay ClaimTypes.Role URI.
            NameClaimType = JwtRegisteredClaimNames.Sub,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder(
            JwtBearerDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .Build();
    options.AddTenantMembershipPolicies();
});

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? ["http://localhost:3000"];

        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Instance = context.HttpContext.Request.Path;
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
    };
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddOpenApi("v1", options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "Cohestra API",
            Version = "v1",
            Description =
                "Cohestra — REST API v1. " +
                "Contracts (Epic 2→3 gate): " +
                "docs/contracts/activity-form-schema-v1.md, " +
                "docs/contracts/public-registration-v1.md"
        };
        return Task.CompletedTask;
    });
});

// /ready stays anonymous. Checks: postgres + redis connectivity, plus default tenant row
// (fail-closed Unhealthy if TenantIds.Default is missing after Story 11.2 seed).
builder.Services.AddHealthChecks()
    .AddNpgSql(postgresConnection, name: "postgres", tags: ["ready"])
    .AddRedis(redisConnection, name: "redis", tags: ["ready"])
    .AddCheck<DefaultTenantReadyHealthCheck>("default-tenant", tags: ["ready"]);

var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor
        | ForwardedHeaders.XForwardedProto
        | ForwardedHeaders.XForwardedHost,
    // nginx on the same host reaches the API via Docker-published localhost ports
    KnownNetworks = { },
    KnownProxies = { },
});

await ApplyMigrationsAsync(app);
LogStartupSeedConfiguration(app);
await OperatorSeeder.SeedAsync(app.Services);
await PlatformAdminSeeder.SeedAsync(app.Services);
await SitePageSeeder.SeedAsync(app.Services);
await DemoDataSeeder.SeedAsync(app.Services);

var loadTestSeedEnabled = app.Configuration.GetValue("LoadTestSeed:Enabled", false);

if (loadTestSeedEnabled)
{
    app.Logger.LogInformation(
        "Load test seed running synchronously before accepting traffic (first run or ForceReseed can take several minutes).");
    await RunLoadTestSeedSafelyAsync(app);
}

await LogStartupLoginAccountsAsync(app);
LogPaddleDefaultPaymentLink(app);

app.UseExceptionHandler();
app.UseCors();
app.UseStatusCodePages(async statusCodeContext =>
{
    if (statusCodeContext.HttpContext.Response.HasStarted)
    {
        return;
    }

    var problem = new ProblemDetails
    {
        Status = statusCodeContext.HttpContext.Response.StatusCode,
        Title = ReasonPhrases.GetReasonPhrase(statusCodeContext.HttpContext.Response.StatusCode),
        Instance = statusCodeContext.HttpContext.Request.Path
    };
    problem.Extensions["traceId"] = statusCodeContext.HttpContext.TraceIdentifier;

    statusCodeContext.HttpContext.Response.ContentType = "application/problem+json";
    await statusCodeContext.HttpContext.Response.WriteAsJsonAsync(problem);
});

app.UseAuthentication();
app.UseTenantResolution();
app.UsePublicRegistrationRateLimit();
app.UsePublicSignupRateLimit();
app.UseAuthorization();
app.UseTenantWriteAccess();

app.MapControllers();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.Lifetime.ApplicationStarted.Register(() =>
{
    var stoppingToken = app.Lifetime.ApplicationStopping;

    _ = Task.Run(async () =>
    {
        if (stoppingToken.IsCancellationRequested)
        {
            return;
        }

        try
        {
            await using var scope = app.Services.CreateAsyncScope();
            var healthChecks = scope.ServiceProvider.GetRequiredService<HealthCheckService>();
            var report = await healthChecks.CheckHealthAsync(
                c => c.Tags.Contains("ready"),
                stoppingToken);

            if (report.Status == HealthStatus.Healthy)
            {
                app.Logger.LogInformation(
                    "Startup connection checks passed for PostgreSQL ({PostgresTarget}) and Redis ({RedisTarget})",
                    GetPostgresTarget(postgresConnection),
                    GetRedisTarget(redisConnection));
            }
            else
            {
                app.Logger.LogWarning(
                    "Startup connection checks returned {Status}: {Checks}",
                    report.Status,
                    string.Join(", ", report.Entries.Select(e => $"{e.Key}={e.Value.Status}")));
            }
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Startup connection checks failed");
        }
    });
});

app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.MapHealthChecks("/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var payload = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.ToDictionary(
                e => e.Key,
                e => new { status = e.Value.Status.ToString() })
        };
        await context.Response.WriteAsJsonAsync(payload);
    }
});

app.Run();

static async Task ApplyMigrationsAsync(WebApplication app)
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
    await db.Database.MigrateAsync();
    app.Logger.LogInformation("Database migrations applied successfully.");
}

static string GetPostgresTarget(string connectionString)
{
    foreach (var part in connectionString.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    {
        if (part.StartsWith("Host=", StringComparison.OrdinalIgnoreCase))
        {
            return part["Host=".Length..];
        }
    }

    return "unknown";
}

static string GetRedisTarget(string connectionString)
{
    var endpoint = connectionString.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0];
    return string.IsNullOrWhiteSpace(endpoint) ? "unknown" : endpoint;
}

static void LogStartupSeedConfiguration(WebApplication app)
{
    var config = app.Configuration;
    var devTenantSlug = config["DEV_TENANT_SLUG"] ?? config.GetSection("Tenancy")["DevTenantSlug"] ?? "(not set — bare localhost uses email login + handoff)";
    app.Logger.LogInformation(
        "Startup seed flags — DEV_TENANT_SLUG={DevTenantSlug}, OperatorSeed:Enabled={OperatorEnabled}, " +
        "DemoDataSeed:Enabled={DemoEnabled}, LoadTestSeed:Enabled={LoadTestEnabled}, LoadTestSeed:ForceReseed={LoadTestForceReseed}. " +
        "After changing .env, recreate the API container: docker compose build api --no-cache && docker compose up -d --force-recreate api web",
        devTenantSlug,
        config.GetValue("OperatorSeed:Enabled", false),
        config.GetValue("DemoDataSeed:Enabled", false),
        config.GetValue("LoadTestSeed:Enabled", false),
        config.GetValue("LoadTestSeed:ForceReseed", false));
}

static void LogPaddleDefaultPaymentLink(WebApplication app)
{
    if (string.IsNullOrWhiteSpace(app.Configuration["Paddle:ApiKey"]))
    {
        return;
    }

    var publicBase = app.Configuration["PublicWeb:BaseUrl"] ?? "https://cohestra.app";
    var link = TenantPublicWebUrlBuilder.BuildPaddleDefaultPaymentLink(publicBase);
    app.Logger.LogInformation(
        "Paddle Checkout settings → Default payment link path is {DefaultPaymentLink} " +
        "(marketing apex, no tenant slug). Paddle stores this as HTTPS even for localhost; " +
        "local overlay checkout does not redirect there. Production: https://cohestra.app/billing/paddle-return.",
        link);
}

static async Task LogStartupLoginAccountsAsync(WebApplication app)
{
    await using var scope = app.Services.CreateAsyncScope();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var operatorEmail = app.Configuration["OperatorSeed:Email"] ?? "operator@cohestra.local";
    var loadTestPassword = app.Configuration["LoadTestSeed:Password"] ?? LoadTestDataSeeder.DefaultPassword;

    var operatorUser = await userManager.FindByEmailAsync(operatorEmail);
    app.Logger.LogInformation(
        "Login readiness — operator {Email}: {Status}",
        operatorEmail,
        operatorUser?.EmailConfirmed == true ? "ready" : "missing (set OperatorSeed__Enabled=true and recreate api)");

    if (app.Configuration.GetValue("LoadTestSeed:Enabled", false))
    {
        var loadTestEmail = "load.core.alpha@cohestra.local";
        var loadTestUser = await userManager.FindByEmailAsync(loadTestEmail);
        app.Logger.LogInformation(
            "Login readiness — load test {Email}: {Status} (password from LoadTestSeed__Password, default {DefaultPassword})",
            loadTestEmail,
            loadTestUser?.EmailConfirmed == true
                ? "ready"
                : "missing — check api logs for load test seed errors",
            LoadTestDataSeeder.DefaultPassword);
    }
}

static async Task RunLoadTestSeedSafelyAsync(WebApplication app)
{
    if (!app.Configuration.GetValue("LoadTestSeed:Enabled", false))
    {
        return;
    }

    try
    {
        await LoadTestDataSeeder.SeedAsync(app.Services);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(
            ex,
            "Load test seed failed. API will continue starting. " +
            "Check logs for constraint violations, then set LoadTestSeed:ForceReseed=true and restart the API.");
    }
}

public partial class Program { }
