using System.Net;

namespace Chuck.API.Models;

/**
 * <summary>
 * Immutable set of IP addresses and CIDR subnets parsed from a comma-separated <c>ChuckSettings</c> value
 * (e.g. <c>TrustedProxies</c> or <c>AllowedNetworks</c>), with fast membership testing.
 * </summary>
 */
public sealed class ParsedNetworkEntries
{
	/**
	 * <summary>
	 * A shared instance representing an unset or empty setting.
	 * </summary>
	 */
	public static ParsedNetworkEntries Empty { get; } = new([], []);

	/**
	 * <summary>
	 * Individual IP addresses (IPv4-mapped IPv6 addresses are normalised to IPv4).
	 * </summary>
	 */
	public IReadOnlyList<IPAddress> Addresses { get; }

	/**
	 * <summary>
	 * CIDR subnets, with any host bits already masked off.
	 * </summary>
	 */
	public IReadOnlyList<System.Net.IPNetwork> Networks { get; }

	/**
	 * <summary>
	 * Indicates whether at least one address or subnet was configured.
	 * </summary>
	 */
	public bool HasEntries => Addresses.Count > 0 || Networks.Count > 0;

	public ParsedNetworkEntries(IReadOnlyList<IPAddress> addresses, IReadOnlyList<System.Net.IPNetwork> networks)
	{
		Addresses = addresses;
		Networks = networks;
	}

	/**
	 * <summary>
	 * Determines whether the supplied client address matches any configured address or falls inside any configured subnet.
	 * </summary>
	 * <param name="address">The client address to test. A <c>null</c> (unresolvable) address never matches.</param>
	 * <returns><c>true</c> if the address is covered by this set; otherwise <c>false</c>.</returns>
	 */
	public bool Contains(IPAddress? address)
	{
		if (address == null)
		{
			return false;
		}

		if (address.IsIPv4MappedToIPv6)
		{
			address = address.MapToIPv4();
		}

		foreach (var candidate in Addresses)
		{
			if (candidate.Equals(address))
			{
				return true;
			}
		}

		foreach (var network in Networks)
		{
			if (network.Contains(address))
			{
				return true;
			}
		}

		return false;
	}
}
