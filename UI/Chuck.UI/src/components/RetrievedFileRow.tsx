import { useState } from "react";
import {
	ListItem,
	Box,
	Typography,
	Button,
	CircularProgress,
	ListItemAvatar,
	Avatar,
	Tooltip,
	ListItemText,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { formatBytes } from "../utils/formatUtils";
import { getFileIcon } from "../utils/fileUtils";
import { getStoredPasscode } from "../utils/passcodeUtils";

export interface RetrievedFileItem {
	id: string;
	originalName: string;
	sizeBytes: number;
	contentType: string;
	downloadUrl: string;
	burnUrl: string;
}

export interface RetrievedFileRowProps {
	file: RetrievedFileItem;
	onBurnt: (id: string) => void;
}

/**
 * Renders an individual file item in the retrieved drop manifest.
 * Provides split "Download / Again" and "Burn" controls per ADR-012.
 */
export function RetrievedFileRow({ file, onBurnt }: RetrievedFileRowProps) {
	const [isDownloaded, setIsDownloaded] = useState(false);
	const [isBurning, setIsBurning] = useState(false);
	const [burnError, setBurnError] = useState<string | null>(null);

	const handleDownload = () => {
		const passcode = getStoredPasscode();
		const connector = file.downloadUrl.includes("?") ? "&" : "?";
		const downloadUrl = passcode
			? `${file.downloadUrl}${connector}passcode=${encodeURIComponent(passcode)}`
			: file.downloadUrl;

		// Trigger the file download securely via an invisible anchor tag
		const link = document.createElement("a");
		link.href = downloadUrl;
		link.download = file.originalName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Reveal the split "Again" and "Burn" buttons
		setIsDownloaded(true);
	};

	const handleBurn = async () => {
		setIsBurning(true);
		setBurnError(null);
		try {
			const passcode = getStoredPasscode();
			const headers: Record<string, string> = {};
			if (passcode) {
				headers["X-Instance-Passcode"] = passcode;
			}
			const response = await fetch(file.burnUrl, { method: "DELETE", headers });
			if (!response.ok) throw new Error("Failed to burn file");
			onBurnt(file.id);
		} catch {
			setBurnError("Failed to burn");
			setIsBurning(false);
		}
	};

	return (
		<ListItem
			secondaryAction={
				<Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
					{burnError && (
						<Typography color="error" variant="caption">
							{burnError}
						</Typography>
					)}
					{!isDownloaded ? (
						<Button
							variant="outlined"
							size="small"
							startIcon={<DownloadIcon />}
							onClick={handleDownload}
						>
							Download
						</Button>
					) : (
						<Box sx={{ display: "flex", gap: 1 }}>
							<Button
								variant="outlined"
								size="small"
								startIcon={<DownloadIcon />}
								onClick={handleDownload}
							>
								Again
							</Button>
							<Button
								variant="contained"
								color="error"
								size="small"
								startIcon={
									isBurning ? (
										<CircularProgress
											size={16}
											color="inherit"
										/>
									) : (
										<LocalFireDepartmentIcon />
									)
								}
								onClick={handleBurn}
								disabled={isBurning}
							>
								Burn
							</Button>
						</Box>
					)}
				</Box>
			}
		>
			<ListItemAvatar>
				<Avatar
					sx={{ bgcolor: "background.paper", color: "primary.main" }}
				>
					{getFileIcon(file.contentType)}
				</Avatar>
			</ListItemAvatar>
			<Tooltip title={file.originalName} placement="top-start" arrow>
				<ListItemText
					primary={
						<Typography
							sx={{
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
							}}
						>
							{file.originalName}
						</Typography>
					}
					secondary={formatBytes(file.sizeBytes)}
					sx={{ pr: 18, cursor: "default" }}
				/>
			</Tooltip>
		</ListItem>
	);
}
