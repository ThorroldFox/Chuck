using Chuck.API.Services;
using Chuck.API.Orchestrators;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http.Features;
using Chuck.API.Filters;
using Chuck.API.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Optional administrator-defined network lists (comma-separated IPs and/or CIDR subnets). Malformed entries abort startup
// so a typo in an access-control list can never silently leave the instance more open than intended.
var trustedProxies = NetworkEntryParser.Parse(builder.Configuration["ChuckSettings:TrustedProxies"], "ChuckSettings:TrustedProxies");
var allowedNetworks = NetworkEntryParser.Parse(builder.Configuration["ChuckSettings:AllowedNetworks"], "ChuckSettings:AllowedNetworks");

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
	options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
	options.KnownIPNetworks.Clear();
	options.KnownProxies.Clear();

	// Trust X-Forwarded-For strictly from loopback and standard private/container network ranges (RFC 1918 & IPv6 ULA)
	// so Docker and LAN reverse proxies work out-of-the-box without allowing external public clients to spoof rate-limit IPs.
	options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("127.0.0.0/8"));
	options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("10.0.0.0/8"));
	options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("172.16.0.0/12"));
	options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("192.168.0.0/16"));
	options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("::1/128"));
	options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("fc00::/7"));

	// Additional trusted reverse proxies outside the private ranges above (ChuckSettings:TrustedProxies), e.g. a public-facing
	// load balancer or CDN edge. These extend, rather than replace, the defaults.
	foreach (var proxy in trustedProxies.Addresses)
	{
		options.KnownProxies.Add(proxy);
	}

	foreach (var network in trustedProxies.Networks)
	{
		options.KnownIPNetworks.Add(network);
	}
});

builder.Services.AddRateLimiter(options =>
{
	// Strict tier (20 req/min/IP) for brute-force-sensitive endpoints (PIN lookup, passcode verification, and drop creation)
	options.AddPolicy("StrictPolicy", httpContext =>
		RateLimitPartition.GetFixedWindowLimiter(
			partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
			factory: partition => new FixedWindowRateLimiterOptions
			{
				AutoReplenishment = true,
				PermitLimit = 20,
				Window = TimeSpan.FromMinutes(1),
				QueueLimit = 0
			}));

	// General tier (120 req/min/IP) for high-frequency operational endpoints (500ms ZIP status polling, config checks, and GUID-gated file actions)
	options.AddPolicy("GeneralPolicy", httpContext =>
		RateLimitPartition.GetFixedWindowLimiter(
			partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
			factory: partition => new FixedWindowRateLimiterOptions
			{
				AutoReplenishment = true,
				PermitLimit = 120,
				Window = TimeSpan.FromMinutes(1),
				QueueLimit = 0
			}));

	options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Read the setting directly from your appsettings.json, falling back to the 500 MB default if it is missing or invalid
var maxPayloadSize = builder.Configuration.GetValue("ChuckSettings:MaxPayloadSizeBytes", DropService.DefaultMaxPayloadSizeBytes);
if (maxPayloadSize <= 0)
{
	maxPayloadSize = DropService.DefaultMaxPayloadSizeBytes;
}

// 1. Tell the ASP.NET Core Form Reader to accept larger multipart payloads
builder.Services.Configure<FormOptions>(options =>
{
	options.MultipartBodyLengthLimit = maxPayloadSize;
});

// 2. Tell the Kestrel Web Server to allow larger overall HTTP request bodies globally and suppress Server fingerprinting header
builder.WebHost.ConfigureKestrel(serverOptions =>
{
	serverOptions.AddServerHeader = false;
	serverOptions.Limits.MaxRequestBodySize = maxPayloadSize;
});

#if DEBUG
builder.Services.AddCors();
#endif

// Add standard Web API Controllers
builder.Services.AddControllers();

builder.Services.AddMemoryCache();

// Register system services and dependencies
builder.Services.AddSingleton(TimeProvider.System);

var enableVirusScanning = builder.Configuration.GetValue<bool>("ChuckSettings:EnableVirusScanning");
if (enableVirusScanning)
{
	var clamHost = builder.Configuration.GetValue<string>("ChuckSettings:ClamAvHost") ?? "clamav";
	var clamPort = builder.Configuration.GetValue("ChuckSettings:ClamAvPort", 3310);
	builder.Services.AddSingleton<nClam.IClamClient>(new nClam.ClamClient(clamHost, clamPort));
}

builder.Services.AddSingleton<IInstanceAuthorisationService, InstanceAuthorisationService>();
builder.Services.AddScoped<InstancePasscodeFilter>();
builder.Services.AddSingleton<IDropService, DropService>();
builder.Services.AddScoped<IDropsOrchestrator, DropsOrchestrator>(); // Scoped means a fresh orchestrator is created per HTTP request

var app = builder.Build();

// Eagerly resolve DropService on startup to execute the Boot Sweep immediately
var dropService = app.Services.GetRequiredService<IDropService>();
dropService.ExecuteBootSweep();

app.UseForwardedHeaders();

// Append baseline defensive HTTP security headers to all responses
app.Use(async (context, next) =>
{
	context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
	context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
	context.Response.Headers.TryAdd("Referrer-Policy", "no-referrer");
	await next();
});

// Optional client network allow-list (ChuckSettings:AllowedNetworks). Runs after UseForwardedHeaders() so the real client
// address is evaluated, and before rate limiting so rejected clients consume no rate-limit budget. Only /api routes are
// guarded; the SPA shell is still served so restricted visitors see the dedicated network policy screen.
if (allowedNetworks.HasEntries)
{
	app.UseMiddleware<AllowedNetworksMiddleware>(allowedNetworks);
}

app.UseRateLimiter();
app.UseHttpsRedirection();

#if DEBUG
app.UseCors(policy => policy.WithOrigins("http://localhost:5173").AllowAnyMethod().AllowAnyHeader());
#endif

// These are required for Docker containerisation.
app.UseDefaultFiles(); // Tells Kestrel to look for index.html as the default route
app.UseStaticFiles();  // Tells Kestrel to serve the files inside the wwwroot folder

// Tells .NET to map the routes based on the [Route] attributes in our Controllers
app.MapControllers();

app.Run();
