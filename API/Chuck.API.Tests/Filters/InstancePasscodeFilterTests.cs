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

	private static AuthorizationFilterContext CreateContext(HttpContext httpContext)
	{
		var actionContext = new ActionContext(
			httpContext,
			new RouteData(),
			new ActionDescriptor()
		);

		return new AuthorizationFilterContext(
			actionContext,
			new List<IFilterMetadata>()
		);
	}

	[Fact]
	public async Task OnAuthorizationAsync_WhenProtectionDisabled_LeavesResultNull()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(false);
		var httpContext = new DefaultHttpContext();
		var context = CreateContext(httpContext);

		// Act
		await _filter.OnAuthorizationAsync(context);

		// Assert
		Assert.Null(context.Result);
	}

	[Fact]
	public async Task OnAuthorizationAsync_WhenProtectionEnabledAndNoPasscode_ReturnsUnauthorized()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);
		_authService.ValidatePasscode(null).Returns(false);
		var httpContext = new DefaultHttpContext();
		var context = CreateContext(httpContext);

		// Act
		await _filter.OnAuthorizationAsync(context);

		// Assert
		var unauthorized = Assert.IsType<UnauthorizedObjectResult>(context.Result);
		var response = Assert.IsType<MessageResponse>(unauthorized.Value);
		Assert.Equal("Instance passcode required or invalid.", response.Message);
	}

	[Fact]
	public async Task OnAuthorizationAsync_WhenProtectionEnabledAndHeaderValid_LeavesResultNull()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);
		_authService.ValidatePasscode("SecretKey").Returns(true);

		var httpContext = new DefaultHttpContext();
		httpContext.Request.Headers["X-Instance-Passcode"] = "SecretKey";
		var context = CreateContext(httpContext);

		// Act
		await _filter.OnAuthorizationAsync(context);

		// Assert
		Assert.Null(context.Result);
	}

	[Fact]
	public async Task OnAuthorizationAsync_WhenProtectionEnabledAndQueryParamValid_LeavesResultNull()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);
		_authService.ValidatePasscode("QueryKey").Returns(true);

		var httpContext = new DefaultHttpContext();
		httpContext.Request.QueryString = new QueryString("?passcode=QueryKey");
		var context = CreateContext(httpContext);

		// Act
		await _filter.OnAuthorizationAsync(context);

		// Assert
		Assert.Null(context.Result);
	}
}
