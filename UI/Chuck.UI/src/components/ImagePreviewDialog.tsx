import { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export type CopyStatus = "idle" | "copied" | "error";

export interface ImagePreviewDialogProps {
	open: boolean;
	fileName: string;
	loadBlob: () => Promise<Blob>;
	canCopy: boolean;
	isCopying: boolean;
	copyStatus: CopyStatus;
	onCopy: () => void;
	onClose: () => void;
}

/**
 * Lightbox dialog that previews a retrieved image inline and offers a one-click "Copy Image" action.
 * The image is fetched lazily (only once the dialog opens) and rendered from a revocable in-memory object URL,
 * so nothing is written to the user's Downloads folder.
 */
export function ImagePreviewDialog({
	open,
	fileName,
	loadBlob,
	canCopy,
	isCopying,
	copyStatus,
	onCopy,
	onClose,
}: ImagePreviewDialogProps) {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);

	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		let objectUrl: string | null = null;
		setImageUrl(null);
		setLoadFailed(false);

		loadBlob()
			.then((blob) => {
				if (cancelled) return;
				objectUrl = URL.createObjectURL(blob);
				setImageUrl(objectUrl);
			})
			.catch(() => {
				if (!cancelled) setLoadFailed(true);
			});

		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [open, loadBlob]);

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			aria-labelledby="image-preview-title"
		>
			<DialogTitle
				id="image-preview-title"
				sx={{
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
				}}
			>
				{fileName}
			</DialogTitle>
			<DialogContent
				sx={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					minHeight: 160,
				}}
			>
				{loadFailed ? (
					<Alert severity="error" sx={{ width: "100%" }}>
						This image could not be loaded. It may have been burnt
						or expired.
					</Alert>
				) : imageUrl ? (
					<Box
						component="img"
						src={imageUrl}
						alt={fileName}
						sx={{
							maxWidth: "100%",
							maxHeight: "65vh",
							objectFit: "contain",
							borderRadius: 1,
						}}
					/>
				) : (
					<CircularProgress aria-label="Loading preview" />
				)}
				{copyStatus === "error" && (
					<Typography
						color="error"
						variant="caption"
						role="alert"
						sx={{ mt: 1.5 }}
					>
						Could not copy the image to the clipboard.
					</Typography>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				{canCopy && (
					<Button
						variant="contained"
						startIcon={
							isCopying ? (
								<CircularProgress size={16} color="inherit" />
							) : copyStatus === "copied" ? (
								<CheckIcon />
							) : (
								<ContentCopyIcon />
							)
						}
						onClick={onCopy}
						disabled={isCopying || !imageUrl}
					>
						{copyStatus === "copied" ? "Copied!" : "Copy Image"}
					</Button>
				)}
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}
