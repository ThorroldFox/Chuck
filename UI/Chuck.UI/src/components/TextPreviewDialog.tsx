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
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export interface TextPreviewDialogProps {
	open: boolean;
	fileName: string;
	loadText: () => Promise<string>;
	onClose: () => void;
}

/**
 * Modal dialog that previews a retrieved plain text, code, or configuration file inline
 * and offers a one-click "Copy Text" action. The text content is fetched lazily only once
 * the dialog opens, without writing to the user's Downloads directory.
 */
export function TextPreviewDialog({
	open,
	fileName,
	loadText,
	onClose,
}: TextPreviewDialogProps) {
	const [textContent, setTextContent] = useState<string | null>(null);
	const [loadFailed, setLoadFailed] = useState(false);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		setTextContent(null);
		setLoadFailed(false);
		setCopied(false);

		loadText()
			.then((text) => {
				if (!cancelled) {
					setTextContent(text);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setLoadFailed(true);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [open, loadText]);

	const handleCopy = async () => {
		if (!textContent) return;
		try {
			await navigator.clipboard.writeText(textContent);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard write fallback or error
		}
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			aria-labelledby="text-preview-title"
		>
			<DialogTitle
				id="text-preview-title"
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
					minHeight: 160,
				}}
			>
				{loadFailed ? (
					<Alert severity="error" sx={{ width: "100%" }}>
						This file could not be loaded. It may have been burnt or expired.
					</Alert>
				) : textContent !== null ? (
					<Box
						component="pre"
						sx={{
							m: 0,
							p: 2,
							fontFamily:
								'Consolas, "Roboto Mono", "Courier New", monospace',
							fontSize: "0.85rem",
							lineHeight: 1.5,
							whiteSpace: "pre-wrap",
							wordBreak: "break-all",
							maxHeight: "65vh",
							overflowY: "auto",
							bgcolor: "background.default",
							color: "text.primary",
							borderRadius: 1,
							border: "1px solid",
							borderColor: "divider",
						}}
					>
						{textContent}
					</Box>
				) : (
					<Box
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							minHeight: 160,
						}}
					>
						<CircularProgress aria-label="Loading preview" />
					</Box>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				{textContent !== null && (
					<Button
						variant="outlined"
						size="small"
						startIcon={
							copied ? (
								<CheckIcon fontSize="small" color="success" />
							) : (
								<ContentCopyIcon fontSize="small" />
							)
						}
						onClick={handleCopy}
					>
						{copied ? "Copied!" : "Copy Text"}
					</Button>
				)}
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}
