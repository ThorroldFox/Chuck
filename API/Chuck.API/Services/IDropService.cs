using Chuck.API.Models;

namespace Chuck.API.Services;

public interface IDropService
{
	Task<(int Pin, string BurnToken)> CreateDropAsync(DropRequest request);
	DropPayload? GetDrop(int pin);
	string GetPhysicalFilePath(string fileId);
	bool PayloadFileExists(string fileId);
	bool SidecarExists(int pin);
	void ExtendDropTtl(int pin);
	bool DeleteFile(int pin, string fileId);
	bool DeleteDrop(int pin, string? token = null);
	void ExecuteBootSweep();
	string GetMetaSidecarPath(int pin);
}
