using Chuck.API.Services;
using Microsoft.Extensions.Configuration;

namespace Chuck.API.Tests.Services;

public class InstanceAuthorisationServiceTests
{
	[Fact]
	public void Constructor_WhenNoPasscodesConfigured_ProtectionIsDisabled()
	{
		// Arrange
		var configuration = new ConfigurationBuilder().Build();
		var service = new InstanceAuthorisationService(configuration);

		// Assert
		Assert.False(service.IsPasscodeProtectionEnabled);
		Assert.True(service.ValidatePasscode(null));
		Assert.True(service.ValidatePasscode(""));
		Assert.True(service.ValidatePasscode("any-passcode"));
	}

	[Fact]
	public void Constructor_WhenSinglePasscodeConfigured_CorrectlyValidates()
	{
		// Arrange
		var inMemorySettings = new Dictionary<string, string?>
		{
			{ "ChuckSettings:InstancePasscodes", "TopSecret123" }
		};
		var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
		var service = new InstanceAuthorisationService(configuration);

		// Assert
		Assert.True(service.IsPasscodeProtectionEnabled);
		Assert.True(service.ValidatePasscode("TopSecret123"));
		Assert.False(service.ValidatePasscode("WrongPasscode"));
		Assert.False(service.ValidatePasscode(""));
		Assert.False(service.ValidatePasscode(null));
	}

	[Fact]
	public void Constructor_WhenMultipleCommaSeparatedPasscodesConfigured_AcceptsAnyValidPasscode()
	{
		// Arrange
		var inMemorySettings = new Dictionary<string, string?>
		{
			{ "ChuckSettings:InstancePasscodes", "Alpha123, Beta456, Gamma789" }
		};
		var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
		var service = new InstanceAuthorisationService(configuration);

		// Assert
		Assert.True(service.IsPasscodeProtectionEnabled);
		Assert.True(service.ValidatePasscode("Alpha123"));
		Assert.True(service.ValidatePasscode("Beta456"));
		Assert.True(service.ValidatePasscode("Gamma789"));
		Assert.False(service.ValidatePasscode("Delta000"));
	}

	[Fact]
	public void Constructor_WhenInstancePasscodeSingularKeyUsed_FallbackWorksCorrectly()
	{
		// Arrange
		var inMemorySettings = new Dictionary<string, string?>
		{
			{ "ChuckSettings:InstancePasscode", "FallbackKey999" }
		};
		var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
		var service = new InstanceAuthorisationService(configuration);

		// Assert
		Assert.True(service.IsPasscodeProtectionEnabled);
		Assert.True(service.ValidatePasscode("FallbackKey999"));
		Assert.False(service.ValidatePasscode("OtherKey"));
	}
}
