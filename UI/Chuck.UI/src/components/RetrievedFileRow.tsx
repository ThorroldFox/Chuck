import { useCallback, useEffect, useRef, useState } from "react";
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
	IconButton,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { formatBytes } from "../utils/formatUtils";
import { getFileIcon } from "../utils/fileUtils";
import { getStoredPasscode } from "../utils/passcodeUtils";
import {
	canCopyImageToClipboard,
	copyImageToClipboard,
	isPreviewableImage,
} from "../utils/imageUtils";
import { isPreviewableText } from "../utils/textUtils";
import { ImagePreviewDialog, type CopyStatus } from "./ImagePreviewDialog";
import { TextPreviewDialog } from "./TextPreviewDialog";

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
 * Provides split "Download / Again" and "Burn" controls, plus inline preview
 * and one-click "Copy Image" for raster images so screenshots never have to touch the Downloads folder.
 */
export function RetrievedFileRow({ file, onBurnt }: RetrievedFileRowProps) {
	const [isDownloaded, setIsDownloaded] = useState(false);
	const [isBurning, setIsBurning] = useState(false);
	const [burnError, setBurnError] = useState<string | null>(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [textPreviewOpen, setTextPreviewOpen] = useState(false);
	const [isCopying, setIsCopying] = useState(false);
	const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

	const blobPromiseRef = useRef<Promise<Blob> | null>(null);
	const textPromiseRef = useRef<Promise<string> | null>(null);
	const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const isImage = isPreviewableImage(file.contentType, file.sizeBytes);
	const isText =
		!isImage &&
		isPreviewableText(file.contentType, file.originalName, file.sizeBytes);
	const canCopyImage = isImage && canCopyImageToClipboard();

	useEffect(
		() => () => {
			if (copyResetTimerRef.current) {
				clearTimeout(copyResetTimerRef.current);
			}
		},
		[],
	);

	// Fetches the image once and caches the in-flight promise so Preview and Copy share a single request.
	const loadBlob = useCallback((): Promise<Blob> => {
		if (!blobPromiseRef.current) {
			const passcode = getStoredPasscode();
			const headers: Record<string, string> = {};
			if (passcode) {
				headers["X-Instance-Passcode"] = passcode;
			}
			blobPromiseRef.current = fetch(file.downloadUrl, { headers })
				.then((response) => {
					if (!response.ok) {
						throw new Error("Failed to load image");
					}
					return response.blob();
				})
				.catch((error) => {
					// Allow a retry after a transient failure
					blobPromiseRef.current = null;
					throw error;
				});
		}
		return blobPromiseRef.current;
	}, [file.downloadUrl]);

	// Fetches the text file payload lazily once the preview dialog opens.
	const loadText = useCallback((): Promise<string> => {
		if (!textPromiseRef.current) {
			const passcode = getStoredPasscode();
			const headers: Record<string, string> = {};
			if (passcode) {
				headers["X-Instance-Passcode"] = passcode;
			}
			textPromiseRef.current = fetch(file.downloadUrl, { headers })
				.then((response) => {
					if (!response.ok) {
						throw new Error("Failed to load text");
					}
					return response.text();
				})
				.catch((error) => {
					textPromiseRef.current = null;
					throw error;
				});
		}
		return textPromiseRef.current;
	}, [file.downloadUrl]);

	const handleCopyImage = async () => {
		if (copyResetTimerRef.current) {
			clearTimeout(copyResetTimerRef.current);
		}
		setIsCopying(true);
		setCopyStatus("idle");
		try {
			await copyImageToClipboard(loadBlob);
			setCopyStatus("copied");
			copyResetTimerRef.current = setTimeout(
				() => setCopyStatus("idle"),
				2000,
			);
		} catch {
			setCopyStatus("error");
		} finally {
			setIsCopying(false);
		}
	};

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
					{isImage && (
						<Tooltip title="Preview image">
							<IconButton
								size="small"
								aria-label="Preview image"
								onClick={() => setPreviewOpen(true)}
							>
								<VisibilityOutlinedIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					)}
					{isText && (
						<Tooltip title="Preview file">
							<IconButton
								size="small"
								aria-label="Preview file"
								onClick={() => setTextPreviewOpen(true)}
							>
								<VisibilityOutlinedIcon fontSize="small" />
							</IconButton>
						</Tooltip>
					)}
					{canCopyImage && (
						<Tooltip
							title={
								copyStatus === "copied"
									? "Copied!"
									: "Copy image"
							}
						>
							<span>
								<IconButton
									size="small"
									aria-label="Copy image"
									onClick={handleCopyImage}
									disabled={isCopying}
									sx={{
										// The preview dialog offers Copy too, so free up space on narrow screens
										display: { xs: "none", sm: "inline-flex" },
									}}
								>
									{isCopying ? (
										<CircularProgress size={18} />
									) : copyStatus === "copied" ? (
										<CheckIcon
											fontSize="small"
											color="success"
										/>
									) : (
										<ContentCopyIcon fontSize="small" />
									)}
								</IconButton>
							</span>
						</Tooltip>
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
					sx={{
						// Reserve room for the action buttons; images carry extra Preview / Copy icons, text files carry Preview icon
						pr: isImage
							? { xs: 23, sm: 28 }
							: isText
								? { xs: 20, sm: 23 }
								: 18,
						cursor: "default",
					}}
				/>
			</Tooltip>
			{isImage && (
				// Rendered through a portal, so it does not affect the row layout
				<ImagePreviewDialog
					open={previewOpen}
					fileName={file.originalName}
					loadBlob={loadBlob}
					canCopy={canCopyImage}
					isCopying={isCopying}
					copyStatus={copyStatus}
					onCopy={handleCopyImage}
					onClose={() => setPreviewOpen(false)}
				/>
			)}
			{isText && (
				<TextPreviewDialog
					open={textPreviewOpen}
					fileName={file.originalName}
					loadText={loadText}
					onClose={() => setTextPreviewOpen(false)}
				/>
			)}
		</ListItem>
	);
}
