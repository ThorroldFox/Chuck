using System.Net;
using Chuck.API.Filters;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Chuck.API.Tests.Filters;

public class LoopbackOnlyFilterTests
{
	private static EndpointFilterInvocationContext CreateContext(IPAddress? remoteIp)
	{
		var httpContext = new DefaultHttpContext();
		httpContext.Connection.RemoteIpAddress = remoteIp;
		return EndpointFilterInvocationContext.Create(httpContext);
	}

	[Fact]
	public async Task InvokeAsync_WhenRemoteIpIsIpv4Loopback_CallsNext()
	{
		// Arrange
		var filter = new LoopbackOnlyFilter();
		var context = CreateContext(IPAddress.Loopback);
		bool nextCalled = false;

		// Act
		var result = await filter.InvokeAsync(context, _ =>
		{
			nextCalled = true;
			return ValueTask.FromResult<object?>("ok");
		});

		// Assert
		Assert.True(nextCalled);
		Assert.Equal("ok", result);
	}

	[Fact]
	public async Task InvokeAsync_WhenRemoteIpIsIpv6Loopback_CallsNext()
	{
		// Arrange
		var filter = new LoopbackOnlyFilter();
		var context = CreateContext(IPAddress.IPv6Loopback);
		bool nextCalled = false;

		// Act
		var result = await filter.InvokeAsync(context, _ =>
		{
			nextCalled = true;
			return ValueTask.FromResult<object?>("ok");
		});

		// Assert
		Assert.True(nextCalled);
		Assert.Equal("ok", result);
	}

	[Fact]
	public async Task InvokeAsync_WhenRemoteIpIsNull_ReturnsNotFound()
	{
		// Arrange
		var filter = new LoopbackOnlyFilter();
		var context = CreateContext(null);
		bool nextCalled = false;

		// Act
		var result = await filter.InvokeAsync(context, _ =>
		{
			nextCalled = true;
			return ValueTask.FromResult<object?>("ok");
		});

		// Assert
		Assert.False(nextCalled);
		Assert.IsType<NotFound>(result);
	}

	[Theory]
	[InlineData("192.168.1.50")]
	[InlineData("10.0.0.1")]
	[InlineData("172.17.0.2")]
	[InlineData("203.0.113.195")]
	public async Task InvokeAsync_WhenRemoteIpIsNotLoopback_ReturnsNotFound(string ip)
	{
		// Arrange
		var filter = new LoopbackOnlyFilter();
		var context = CreateContext(IPAddress.Parse(ip));
		bool nextCalled = false;

		// Act
		var result = await filter.InvokeAsync(context, _ =>
		{
			nextCalled = true;
			return ValueTask.FromResult<object?>("ok");
		});

		// Assert
		Assert.False(nextCalled);
		Assert.IsType<NotFound>(result);
	}
}
