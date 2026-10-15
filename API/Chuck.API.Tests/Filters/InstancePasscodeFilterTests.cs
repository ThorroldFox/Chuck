using Chuck.API.Filters;
using Chuck.API.Models.Responses;
using Chuck.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using NSubstitute;

namespace Chuck.API.Tests.Filters;

public class InstancePasscodeFilterTests
{
	private readonly IInstanceAuthorisationService _authService = Substitute.For<IInstanceAuthorisationService>();
	private readonly InstancePasscodeFilter _filter;

	public InstancePasscodeFilterTests()
	{
		_filter = new InstancePasscodeFilter(_authService);
	}

	private static ActionExecutingContext CreateContext(HttpContext httpContext)
	{
		var actionContext = new ActionContext(
			httpContext,
			new RouteData(),
			new ActionDescriptor()
		);

		return new ActionExecutingContext(
			actionContext,
			new List<IFilterMetadata>(),
			new Dictionary<string, object?>(),
			controller: new object()
		);
	}

	[Fact]
	public async Task OnActionExecutionAsync_WhenProtectionDisabled_InvokesNext()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(false);
		var httpContext = new DefaultHttpContext();
		var context = CreateContext(httpContext);
		var nextInvoked = false;

		ActionExecutionDelegate next = () =>
		{
			nextInvoked = true;
			return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), controller: new object()));
		};

		// Act
		await _filter.OnActionExecutionAsync(context, next);

		// Assert
		Assert.True(nextInvoked);
		Assert.Null(context.Result);
	}

	[Fact]
	public async Task OnActionExecutionAsync_WhenProtectionEnabledAndNoPasscode_ReturnsUnauthorized()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);
		_authService.ValidatePasscode(null).Returns(false);
		var httpContext = new DefaultHttpContext();
		var context = CreateContext(httpContext);
		var nextInvoked = false;

		ActionExecutionDelegate next = () =>
		{
			nextInvoked = true;
			return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), controller: new object()));
		};

		// Act
		await _filter.OnActionExecutionAsync(context, next);

		// Assert
		Assert.False(nextInvoked);
		var unauthorized = Assert.IsType<UnauthorizedObjectResult>(context.Result);
		var response = Assert.IsType<MessageResponse>(unauthorized.Value);
		Assert.Equal("Instance passcode required or invalid.", response.Message);
	}

	[Fact]
	public async Task OnActionExecutionAsync_WhenProtectionEnabledAndHeaderValid_InvokesNext()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);
		_authService.ValidatePasscode("SecretKey").Returns(true);

		var httpContext = new DefaultHttpContext();
		httpContext.Request.Headers["X-Instance-Passcode"] = "SecretKey";
		var context = CreateContext(httpContext);
		var nextInvoked = false;

		ActionExecutionDelegate next = () =>
		{
			nextInvoked = true;
			return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), controller: new object()));
		};

		// Act
		await _filter.OnActionExecutionAsync(context, next);

		// Assert
		Assert.True(nextInvoked);
		Assert.Null(context.Result);
	}

	[Fact]
	public async Task OnActionExecutionAsync_WhenProtectionEnabledAndQueryParamValid_InvokesNext()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);
		_authService.ValidatePasscode("QueryKey").Returns(true);

		var httpContext = new DefaultHttpContext();
		httpContext.Request.QueryString = new QueryString("?passcode=QueryKey");
		var context = CreateContext(httpContext);
		var nextInvoked = false;

		ActionExecutionDelegate next = () =>
		{
			nextInvoked = true;
			return Task.FromResult(new ActionExecutedContext(context, new List<IFilterMetadata>(), controller: new object()));
		};

		// Act
		await _filter.OnActionExecutionAsync(context, next);

		// Assert
		Assert.True(nextInvoked);
		Assert.Null(context.Result);
	}
}
