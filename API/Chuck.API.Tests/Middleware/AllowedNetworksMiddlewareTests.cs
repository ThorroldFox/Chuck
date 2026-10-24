using System.Net;
using System.Text.Json;
using Chuck.API.Middleware;
using Chuck.API.Services;
using Microsoft.AspNetCore.Http;

namespace Chuck.API.Tests.Middleware;

public class AllowedNetworksMiddlewareTests
{
	private static async Task<(bool NextCalled, DefaultHttpContext Context)> InvokeAsync(string allowed, string path, string? clientIp)
	{
		bool nextCalled = false;
		var middleware = new AllowedNetworksMiddleware(
			_ =>
			{
				nextCalled = true;
				return Task.CompletedTask;
			},
			NetworkEntryParser.Parse(allowed, "ChuckSettings:AllowedNetworks"));

		var context = new DefaultHttpContext();
		context.Request.Path = path;
		context.Connection.RemoteIpAddress = clientIp == null ? null : IPAddress.Parse(clientIp);
		context.Response.Body = new MemoryStream();

		await middleware.InvokeAsync(context);
		return (nextCalled, context);
	}

	[Fact]
	public async Task InvokeAsync_WhenClientIsInAllowedSubnet_PassesThrough()
	{
		var (nextCalled, context) = await InvokeAsync("192.168.1.0/24", "/api/v1/drops", "192.168.1.20");

		Assert.True(nextCalled);
		Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
	}

	[Fact]
	public async Task InvokeAsync_WhenClientIsOutsideAllowedNetworks_Returns403WithNetworkRestrictedCode()
	{
		var (nextCalled, context) = await InvokeAsync("192.168.1.0/24", "/api/v1/config", "203.0.113.50");

		Assert.False(nextCalled);
		Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);

		context.Response.Body.Position = 0;
		using var json = await JsonDocument.ParseAsync(context.Response.Body);
		Assert.Equal("network_restricted", json.RootElement.GetProperty("code").GetString());
		Assert.False(string.IsNullOrWhiteSpace(json.RootElement.GetProperty("message").GetString()));
	}

	[Fact]
	public async Task InvokeAsync_WhenClientAddressIsUnknown_Returns403()
	{
		var (nextCalled, context) = await InvokeAsync("192.168.1.0/24", "/api/v1/config", null);

		Assert.False(nextCalled);
		Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
	}

	[Theory]
	[InlineData("/")]
	[InlineData("/index.html")]
	[InlineData("/assets/index-abc123.js")]
	public async Task InvokeAsync_ForNonApiRoutes_AlwaysServesStaticShellSoRestrictionScreenCanRender(string path)
	{
		var (nextCalled, context) = await InvokeAsync("192.168.1.0/24", path, "203.0.113.50");

		Assert.True(nextCalled);
		Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
	}

	[Fact]
	public async Task InvokeAsync_AllowsIpv4MappedIpv6ClientsInsideAllowedSubnet()
	{
		var (nextCalled, _) = await InvokeAsync("10.0.0.0/8", "/api/v1/drops/1234", "::ffff:10.1.2.3");

		Assert.True(nextCalled);
	}

	[Fact]
	public async Task InvokeAsync_DoesNotImplicitlyExemptLoopback()
	{
		// A same-host reverse proxy that fails to forward client headers must not open the whole instance.
		var (nextCalled, context) = await InvokeAsync("192.168.1.0/24", "/api/v1/config", "127.0.0.1");

		Assert.False(nextCalled);
		Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
	}
}
