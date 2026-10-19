using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Chuck.API.Services;
using Chuck.API.Models.Responses;

namespace Chuck.API.Filters;

/**
 * <summary>
 * Authorisation filter that enforces instance access passcode validation across protected endpoints.
 * Executes prior to model binding so unauthenticated multipart uploads are rejected before buffering request bodies.
 * </summary>
 */
public class InstancePasscodeFilter : IAsyncAuthorizationFilter
{
	private readonly IInstanceAuthorisationService _authService;

	public InstancePasscodeFilter(IInstanceAuthorisationService authService)
	{
		_authService = authService;
	}

	/**
	 * <inheritdoc />
	 */
	public Task OnAuthorizationAsync(AuthorizationFilterContext context)
	{
		if (!_authService.IsPasscodeProtectionEnabled)
		{
			return Task.CompletedTask;
		}

		string? passcode = context.HttpContext.Request.Headers["X-Instance-Passcode"].FirstOrDefault()
			?? context.HttpContext.Request.Query["passcode"].FirstOrDefault();

		if (!_authService.ValidatePasscode(passcode))
		{
			context.Result = new UnauthorizedObjectResult(new MessageResponse
			{
				Message = "Instance passcode required or invalid."
			});
		}

		return Task.CompletedTask;
	}
}
