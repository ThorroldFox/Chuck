using Chuck.API.Services;
using Chuck.API.Orchestrators;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http.Features;
using Chuck.API.Filters;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
	options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
	options.KnownNetworks.Clear();
	options.KnownProxies.Clear();
});

builder.Services.AddRateLimiter(options =>
{
	options.AddPolicy("StrictPolicy", httpContext =>
		RateLimitPartition.GetFixedWindowLimiter(
			partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
			factory: partition => new FixedWindowRateLimiterOptions
			{
				AutoReplenishment = true,
				PermitLimit = 10,
				Window = TimeSpan.FromMinutes(1),
				QueueLimit = 0
			}));

	options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Read the setting directly from your appsettings.json
var maxPayloadSize = builder.Configuration.GetValue<long>("ChuckSettings:MaxPayloadSizeBytes");

// 1. Tell the ASP.NET Core Form Reader to accept larger multipart payloads
builder.Services.Configure<FormOptions>(options =>
{
	options.MultipartBodyLengthLimit = maxPayloadSize;
});

// 2. Tell the Kestrel Web Server to allow larger overall HTTP request bodies globally
builder.WebHost.ConfigureKestrel(serverOptions =>
{
	serverOptions.Limits.MaxRequestBodySize = maxPayloadSize;
});

// Unsure this is strictly needed?
// builder.Services.AddCors();

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
app.UseRateLimiter();
app.UseHttpsRedirection();

#if DEBUG
app.UseCors(policy => policy.WithOrigins("http://localhost:5173").AllowAnyMethod().AllowAnyHeader());
#else
    app.UseCors();
#endif

// These are required for Docker containerisation.
app.UseDefaultFiles(); // Tells Kestrel to look for index.html as the default route
app.UseStaticFiles();  // Tells Kestrel to serve the files inside the wwwroot folder

// Tells .NET to map the routes based on the [Route] attributes in our Controllers
app.MapControllers();

app.Run();
