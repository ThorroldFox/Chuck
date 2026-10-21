using Chuck.API.Controllers;
using Chuck.API.Models.Requests;
using Chuck.API.Models.Responses;
using Chuck.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace Chuck.API.Tests.Controllers;

public class ConfigControllerTests
{
	private readonly IInstanceAuthorisationService _authService = Substitute.For<IInstanceAuthorisationService>();
	private readonly IDropService _dropService = Substitute.For<IDropService>();
	private readonly ConfigController _controller;

	public ConfigControllerTests()
	{
		_controller = new ConfigController(_authService, _dropService)
		{
			ControllerContext = new ControllerContext
			{
				HttpContext = new DefaultHttpContext()
			}
		};
	}

	[Fact]
	public void GetConfig_ReturnsConfiguredMaxPayloadSizeBytes()
	{
		// Arrange
		_dropService.MaxPayloadSizeBytes.Returns(1073741824L);

		// Act
		var result = _controller.GetConfig();

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<InstanceConfigResponse>(okResult.Value);
		Assert.Equal(1073741824L, response.MaxPayloadSizeBytes);
	}

	[Fact]
	public void GetConfig_WhenProtectionDisabled_ReturnsFalse()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(false);

		// Act
		var result = _controller.GetConfig();

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<InstanceConfigResponse>(okResult.Value);
		Assert.False(response.IsPasscodeProtected);
	}

	[Fact]
	public void GetConfig_WhenProtectionEnabled_ReturnsTrue()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);

		// Act
		var result = _controller.GetConfig();

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<InstanceConfigResponse>(okResult.Value);
		Assert.True(response.IsPasscodeProtected);
	}

	[Fact]
	public void VerifyPasscode_WhenProtectionDisabled_ReturnsOk()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(false);

		// Act
		var result = _controller.VerifyPasscode(new VerifyPasscodeRequest { Passcode = "any" });

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(okResult.Value);
		Assert.Equal("Instance is not protected.", response.Message);
	}

	[Fact]
	public void VerifyPasscode_WhenValidViaBody_ReturnsOk()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);
		_authService.ValidatePasscode("Secret123").Returns(true);

		// Act
		var result = _controller.VerifyPasscode(new VerifyPasscodeRequest { Passcode = "Secret123" });

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(okResult.Value);
		Assert.Equal("Passcode verified.", response.Message);
	}

	[Fact]
	public void VerifyPasscode_WhenValidViaHeader_ReturnsOk()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);
		_authService.ValidatePasscode("HeaderKey").Returns(true);
		_controller.HttpContext.Request.Headers["X-Instance-Passcode"] = "HeaderKey";

		// Act
		var result = _controller.VerifyPasscode(null);

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(okResult.Value);
		Assert.Equal("Passcode verified.", response.Message);
	}

	[Fact]
	public void VerifyPasscode_WhenInvalidPasscode_ReturnsUnauthorized()
	{
		// Arrange
		_authService.IsPasscodeProtectionEnabled.Returns(true);
		_authService.ValidatePasscode("Wrong").Returns(false);

		// Act
		var result = _controller.VerifyPasscode(new VerifyPasscodeRequest { Passcode = "Wrong" });

		// Assert
		var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(unauthorized.Value);
		Assert.Equal("Incorrect instance passcode.", response.Message);
	}
}
