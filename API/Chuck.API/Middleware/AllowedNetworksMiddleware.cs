using Chuck.API.Models;
using Chuck.API.Models.Responses;

namespace Chuck.API.Middleware;

/**
 * <summary>
 * Rejects API requests originating outside the networks listed in <c>ChuckSettings:AllowedNetworks</c> with HTTP 403.
 * </summary>
 * <remarks>
 * Only <c>/api</c> routes are guarded. The static single-page application is still served so that restricted visitors see the
 * dedicated "Access Restricted by Network Policy" screen instead of a blank browser error. Client addresses are deliberately
 * never logged, preserving Chuck's no-IP-storage privacy promise. Must be registered after <c>UseForwardedHeaders()</c> so the
 * resolved client address (not the reverse proxy's) is evaluated.
 * </remarks>
 */
public sealed class AllowedNetworksMiddleware
{
	private readonly RequestDelegate _next;
	private readonly ParsedNetworkEntries _allowedNetworks;

	public AllowedNetworksMiddleware(RequestDelegate next, ParsedNetworkEntries allowedNetworks)
	{
		_next = next;
		_allowedNetworks = allowedNetworks;
	}

	public async Task InvokeAsync(HttpContext context)
	{
		if (!context.Request.Path.StartsWithSegments("/api")
			|| _allowedNetworks.Contains(context.Connection.RemoteIpAddress))
		{
			await _next(context);
			return;
		}

		context.Response.StatusCode = StatusCodes.Status403Forbidden;
		await context.Response.WriteAsJsonAsync(new NetworkRestrictedResponse());
	}
}
