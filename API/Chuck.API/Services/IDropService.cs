using Chuck.API.Models;

namespace Chuck.API.Services;

public interface IDropService
{
	Task<(string Pin, string BurnToken)> CreateDropAsync(DropRequest request);
	DropPayload? GetDrop(string pin);
	string GetPhysicalFilePath(string fileId);
	bool PayloadFileExists(string fileId);
	bool SidecarExists(string pin);
	void ExtendDropTtl(string pin);
	bool DeleteFile(string pin, string fileId);
	bool DeleteDrop(string pin, string? token = null);
	void ExecuteBootSweep();
	string GetMetaSidecarPath(string pin);
}
