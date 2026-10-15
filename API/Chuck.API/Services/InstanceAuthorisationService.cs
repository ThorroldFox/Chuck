using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace Chuck.API.Services;

/**
 * <summary>
 * Validates instance-level access passcodes using constant-time cryptographic comparisons.
 * </summary>
 */
public class InstanceAuthorisationService : IInstanceAuthorisationService
{
	private readonly byte[][] _targetHashes;

	public InstanceAuthorisationService(IConfiguration configuration)
	{
		var rawConfig = configuration.GetValue<string>("ChuckSettings:InstancePasscodes")
			?? configuration.GetValue<string>("ChuckSettings:InstancePasscode");

		if (string.IsNullOrWhiteSpace(rawConfig))
		{
			_targetHashes = [];
			return;
		}

		var passcodes = rawConfig
			.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
			.Where(p => !string.IsNullOrEmpty(p))
			.Distinct()
			.ToArray();

		_targetHashes = passcodes
			.Select(p => SHA256.HashData(Encoding.UTF8.GetBytes(p)))
			.ToArray();
	}

	/**
	 * <inheritdoc />
	 */
	public bool IsPasscodeProtectionEnabled => _targetHashes.Length > 0;

	/**
	 * <inheritdoc />
	 */
	public bool ValidatePasscode(string? candidatePasscode)
	{
		if (!IsPasscodeProtectionEnabled)
		{
			return true;
		}

		if (string.IsNullOrEmpty(candidatePasscode))
		{
			return false;
		}

		var candidateHash = SHA256.HashData(Encoding.UTF8.GetBytes(candidatePasscode));
		var isMatch = false;

		// Perform constant-time comparison against all configured passcodes without early loop exit
		foreach (var targetHash in _targetHashes)
		{
			if (CryptographicOperations.FixedTimeEquals(candidateHash, targetHash))
			{
				isMatch = true;
			}
		}

		return isMatch;
	}
}
