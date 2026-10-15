namespace Chuck.API.Tests.Fixtures;

public sealed class TemporaryStorageFixture : IDisposable
{
	public string DirectoryPath { get; }

	public TemporaryStorageFixture()
	{
		DirectoryPath = Path.Combine(Path.GetTempPath(), "ChuckTests_" + Guid.NewGuid().ToString("N"));
		Directory.CreateDirectory(DirectoryPath);
	}

	public void Dispose()
	{
		if (Directory.Exists(DirectoryPath))
		{
			try
			{
				Directory.Delete(DirectoryPath, recursive: true);
			}
			catch
			{
				// Ignore transient file lock cleanup errors during test teardown
			}
		}
	}
}
