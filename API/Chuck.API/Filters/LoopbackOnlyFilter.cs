using System.Net;
using Microsoft.AspNetCore.Http;

namespace Chuck.API.Filters;

/**
 * <summary>
 * Restricts an endpoint strictly to requests originating from local loopback (127.0.0.1 / ::1),
 * rejecting all external or proxied traffic with HTTP 404 Not Found to eliminate external I/O and abuse.
 * </summary>
 */
public sealed class LoopbackOnlyFilter : IEndpointFilter
{
	public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
	{
		var remoteIp = context.HttpContext.Connection.RemoteIpAddress;
		if (remoteIp == null || !IPAddress.IsLoopback(remoteIp))
		{
			return Results.NotFound();
		}

		return await next(context);
	}
}
