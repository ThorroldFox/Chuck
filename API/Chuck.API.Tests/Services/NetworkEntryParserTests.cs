using System.Net;
using Chuck.API.Services;

namespace Chuck.API.Tests.Services;

public class NetworkEntryParserTests
{
	[Theory]
	[InlineData(null)]
	[InlineData("")]
	[InlineData("   ")]
	public void Parse_WhenUnsetOrBlank_ReturnsEmpty(string? raw)
	{
		var result = NetworkEntryParser.Parse(raw, "ChuckSettings:Test");

		Assert.False(result.HasEntries);
		Assert.False(result.Contains(IPAddress.Parse("10.0.0.1")));
	}

	[Fact]
	public void Parse_ParsesAddressesAndSubnetsAcrossMixedSeparators()
	{
		var result = NetworkEntryParser.Parse("203.0.113.7, 192.168.1.0/24;2001:db8::/32\n100.64.0.0/10", "ChuckSettings:Test");

		Assert.Single(result.Addresses);
		Assert.Equal(3, result.Networks.Count);
		Assert.True(result.HasEntries);
	}

	[Theory]
	[InlineData("203.0.113.7", "203.0.113.7", true)]
	[InlineData("203.0.113.7", "203.0.113.8", false)]
	[InlineData("192.168.1.0/24", "192.168.1.200", true)]
	[InlineData("192.168.1.0/24", "192.168.2.1", false)]
	[InlineData("100.64.0.0/10", "100.127.255.254", true)]
	[InlineData("100.64.0.0/10", "100.128.0.1", false)]
	[InlineData("2001:db8::/32", "2001:db8:abcd::1", true)]
	[InlineData("2001:db8::/32", "2001:db9::1", false)]
	[InlineData("::1", "::1", true)]
	[InlineData("0.0.0.0/0", "8.8.8.8", true)]
	public void Contains_MatchesExpectedClients(string configured, string client, bool expected)
	{
		var result = NetworkEntryParser.Parse(configured, "ChuckSettings:Test");

		Assert.Equal(expected, result.Contains(IPAddress.Parse(client)));
	}

	[Fact]
	public void Contains_NormalisesIpv4MappedIpv6ClientAddresses()
	{
		var result = NetworkEntryParser.Parse("192.168.1.0/24,203.0.113.7", "ChuckSettings:Test");

		Assert.True(result.Contains(IPAddress.Parse("::ffff:192.168.1.50")));
		Assert.True(result.Contains(IPAddress.Parse("::ffff:203.0.113.7")));
		Assert.False(result.Contains(IPAddress.Parse("::ffff:10.0.0.1")));
	}

	[Fact]
	public void Contains_WhenAddressIsNull_ReturnsFalse()
	{
		var result = NetworkEntryParser.Parse("0.0.0.0/0", "ChuckSettings:Test");

		Assert.False(result.Contains(null));
	}

	[Fact]
	public void Parse_MasksHostBitsInSubnetEntries()
	{
		// An administrator typing 192.168.1.77/24 clearly means the whole /24
		var result = NetworkEntryParser.Parse("192.168.1.77/24", "ChuckSettings:Test");

		Assert.True(result.Contains(IPAddress.Parse("192.168.1.1")));
		Assert.True(result.Contains(IPAddress.Parse("192.168.1.254")));
		Assert.False(result.Contains(IPAddress.Parse("192.168.2.1")));
	}

	[Theory]
	[InlineData("not-an-ip")]
	[InlineData("192.168.1.0/33")]
	[InlineData("192.168.1.0/abc")]
	[InlineData("192.168.1.0/-1")]
	[InlineData("2001:db8::/129")]
	[InlineData("192.168.1.0/")]
	[InlineData("1")]
	[InlineData("192.168.1")]
	[InlineData("10.0.0.1,garbage")]
	public void Parse_WhenEntryIsMalformed_ThrowsWithSettingNameAndEntry(string raw)
	{
		var ex = Assert.Throws<InvalidOperationException>(() => NetworkEntryParser.Parse(raw, "ChuckSettings:AllowedNetworks"));

		Assert.Contains("ChuckSettings:AllowedNetworks", ex.Message);
	}
}
