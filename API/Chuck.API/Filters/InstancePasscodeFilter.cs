using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Chuck.API.Services;
using Chuck.API.Models.Responses;

namespace Chuck.API.Filters;

/**
 * <summary>
 * Action filter that enforces instance access passcode validation across protected endpoints.
 * </summary>
 */
public class InstancePasscodeFilter : IAsyncActionFilter
{
	private readonly IInstanceAuthorisationService _authService;

	public InstancePasscodeFilter(IInstanceAuthorisationService authService)
	{
		_authService = authService;
	}

	/**
	 * <inheritdoc />
	 */
	public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
	{
		if (!_authService.IsPasscodeProtectionEnabled)
		{
			await next();
			return;
		}

		string? passcode = context.HttpContext.Request.Headers["X-Instance-Passcode"].FirstOrDefault()
			?? context.HttpContext.Request.Query["passcode"].FirstOrDefault();

		if (!_authService.ValidatePasscode(passcode))
		{
			context.Result = new UnauthorizedObjectResult(new MessageResponse
			{
				Message = "Instance passcode required or invalid."
			});
			return;
		}

		await next();
	}
}
