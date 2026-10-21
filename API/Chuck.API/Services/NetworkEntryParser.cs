using System.Globalization;
using System.Net;
using System.Net.Sockets;
using Chuck.API.Models;

namespace Chuck.API.Services;

/**
 * <summary>
 * Parses comma-separated IP address and CIDR lists from configuration (e.g. <c>ChuckSettings__TrustedProxies</c>
 * and <c>ChuckSettings__AllowedNetworks</c>).
 * </summary>
 */
public static class NetworkEntryParser
{
	private static readonly char[] Separators = [',', ';', ' ', '\t', '\r', '\n'];

	/**
	 * <summary>
	 * Parses a delimited list of IP addresses (<c>203.0.113.7</c>, <c>2001:db8::1</c>) and CIDR subnets
	 * (<c>192.168.1.0/24</c>, <c>100.64.0.0/10</c>). Subnets containing host bits (e.g. <c>192.168.1.5/24</c>) are masked to their network address.
	 * </summary>
	 * <param name="raw">The raw configuration value. Null, empty or whitespace yields <see cref="ParsedNetworkEntries.Empty"/>.</param>
	 * <param name="settingName">The configuration key, quoted in the error message if an entry is invalid.</param>
	 * <returns>The parsed addresses and subnets.</returns>
	 * <exception cref="InvalidOperationException">
	 * Thrown for any malformed entry. Failing fast at startup is deliberate: silently ignoring a typo in an access-control
	 * list would leave the instance more open than the administrator intended.
	 * </exception>
	 */
	public static ParsedNetworkEntries Parse(string? raw, string settingName)
	{
		if (string.IsNullOrWhiteSpace(raw))
		{
			return ParsedNetworkEntries.Empty;
		}

		var addresses = new List<IPAddress>();
		var networks = new List<System.Net.IPNetwork>();

		foreach (var entry in raw.Split(Separators, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
		{
			int slashIndex = entry.IndexOf('/');

			if (slashIndex < 0)
			{
				var address = ParseAddress(entry, entry, settingName);
				addresses.Add(address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address);
				continue;
			}

			var baseAddress = ParseAddress(entry[..slashIndex], entry, settingName);
			int maxPrefixLength = baseAddress.AddressFamily == AddressFamily.InterNetwork ? 32 : 128;

			if (!int.TryParse(entry[(slashIndex + 1)..], NumberStyles.None, CultureInfo.InvariantCulture, out int prefixLength)
				|| prefixLength > maxPrefixLength)
			{
				throw InvalidEntry(entry, settingName, $"the prefix length must be between 0 and {maxPrefixLength}");
			}

			networks.Add(new System.Net.IPNetwork(MaskToPrefix(baseAddress, prefixLength), prefixLength));
		}

		return new ParsedNetworkEntries(addresses, networks);
	}

	private static IPAddress ParseAddress(string addressText, string fullEntry, string settingName)
	{
		// IPAddress.TryParse accepts legacy shorthand such as "1" (0.0.0.1); require canonical dotted-quad IPv4 notation.
		bool looksLikeIpv4 = !addressText.Contains(':');
		if (!IPAddress.TryParse(addressText, out var address)
			|| (looksLikeIpv4 && addressText.Count(c => c == '.') != 3))
		{
			throw InvalidEntry(fullEntry, settingName, "it is not a valid IP address");
		}

		return address;
	}

	private static IPAddress MaskToPrefix(IPAddress address, int prefixLength)
	{
		byte[] bytes = address.GetAddressBytes();

		for (int bitIndex = prefixLength; bitIndex < bytes.Length * 8; bitIndex++)
		{
			bytes[bitIndex / 8] &= (byte)~(0x80 >> (bitIndex % 8));
		}

		return new IPAddress(bytes);
	}

	private static InvalidOperationException InvalidEntry(string entry, string settingName, string reason) =>
		new($"Invalid entry '{entry}' in {settingName}: {reason}. Expected a comma-separated list of IP addresses and/or CIDR subnets (e.g. '192.168.1.0/24,203.0.113.7').");
}
