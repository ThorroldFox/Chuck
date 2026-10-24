using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Chuck.API.Services;
using Chuck.API.Models.Requests;
using Chuck.API.Models.Responses;

namespace Chuck.API.Controllers;

/**
 * <summary>
 * Endpoints for querying instance security configurations and verifying access passcodes.
 * </summary>
 */
[ApiController]
[Route("api/v1/config")]
[EnableRateLimiting("StrictPolicy")]
public class ConfigController : ControllerBase
{
	private readonly IInstanceAuthorisationService _authService;
	private readonly IDropService _dropService;

	public ConfigController(IInstanceAuthorisationService authService, IDropService dropService)
	{
		_authService = authService;
		_dropService = dropService;
	}

	/**
	 * <summary>
	 * Queries public configuration parameters of the active Chuck instance.
	 * </summary>
	 * <returns>An <see cref="InstanceConfigResponse"/> describing whether the instance requires an access passcode and its configured payload size limit.</returns>
	 * <response code="200">Returns instance configuration status.</response>
	 */
	[HttpGet]
	[ProducesResponseType(typeof(InstanceConfigResponse), StatusCodes.Status200OK)]
	public IActionResult GetConfig()
	{
		return Ok(new InstanceConfigResponse
		{
			IsPasscodeProtected = _authService.IsPasscodeProtectionEnabled,
			MaxPayloadSizeBytes = _dropService.MaxPayloadSizeBytes
		});
	}

	/**
	 * <summary>
	 * Verifies whether a candidate passcode grants access to this Chuck instance.
	 * </summary>
	 * <param name="request">Optional JSON payload containing the candidate passcode.</param>
	 * <returns>A <see cref="MessageResponse"/> detailing the verification result.</returns>
	 * <response code="200">Passcode verified or protection is disabled.</response>
	 * <response code="401">Candidate passcode is incorrect.</response>
	 */
	[HttpPost("verify")]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status401Unauthorized)]
	public IActionResult VerifyPasscode([FromBody] VerifyPasscodeRequest? request)
	{
		if (!_authService.IsPasscodeProtectionEnabled)
		{
			return Ok(new MessageResponse { Message = "Instance is not protected." });
		}

		var candidate = request?.Passcode;
		if (string.IsNullOrEmpty(candidate))
		{
			candidate = Request.Headers["X-Instance-Passcode"].FirstOrDefault();
		}

		if (_authService.ValidatePasscode(candidate))
		{
			return Ok(new MessageResponse { Message = "Passcode verified." });
		}

		return Unauthorized(new MessageResponse { Message = "Incorrect instance passcode." });
	}
}
