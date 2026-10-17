import React, { useState, useCallback, useEffect, useRef } from "react";
import {
	Box,
	Typography,
	Paper,
	Tabs,
	Tab,
	TextField,
	InputAdornment,
	Button,
	Alert,
	CircularProgress,
	IconButton,
	Tooltip,
	LinearProgress,
	List,
	ListItem,
	ListItemAvatar,
	ListItemText,
	Avatar,
	Divider,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import LinkIcon from "@mui/icons-material/Link";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { QRCodeSVG } from "qrcode.react";
import { formatBytes } from "../utils/formatUtils";
import { getFileIcon } from "../utils/fileUtils";
import { getStoredPasscode } from "../utils/passcodeUtils";
import { RetrievedFileRow } from "./RetrievedFileRow";

const API_BASE_URL = "/api/drops";
const MAX_FILE_SIZE_BYTES = 524288000; // 500MB

const getQuickCatchUrl = (targetPin: string): string => {
	const url = new URL(window.location.href);
	url.search = "";
	url.hash = "";
	url.searchParams.set("pin", targetPin);
	return url.toString();
};

export interface TransferHubProps {
	onUnauthorized?: () => void;
	isUnlocked?: boolean;
}

export function TransferHub({
	onUnauthorized,
	isUnlocked = true,
}: TransferHubProps = {}) {
	const [tabIndex, setTabIndex] = useState(0);

	// DROP State
	const [dropText, setDropText] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [generatedPin, setGeneratedPin] = useState<string | null>(null);
	const [burnToken, setBurnToken] = useState<string | null>(null);
	const [isCancellingDrop, setIsCancellingDrop] = useState(false);
	const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(
		null,
	);
	const [pinCopied, setPinCopied] = useState(false);
	const [linkCopied, setLinkCopied] = useState(false);

	// RETRIEVE State
	const [pin, setPin] = useState("");
	const [pinPasted, setPinPasted] = useState(false);
	const [retrievedData, setRetrievedData] = useState<any>(null);
	const [textCopied, setTextCopied] = useState(false);
	const pendingUrlPinRef = useRef<string | null>(null);

	// Shared State
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPreparingZip, setIsPreparingZip] = useState(false);

	// State for tracking Zip Download & Burn All
	const [isZipDownloaded, setIsZipDownloaded] = useState(false);
	const [isBurningAll, setIsBurningAll] = useState(false);

	const handleTabChange = (
		_event: React.SyntheticEvent,
		newValue: number,
	) => {
		setTabIndex(newValue);
		setError(null);
		setGeneratedPin(null);
		setBurnToken(null);
		setIsCancellingDrop(false);
		setCancelSuccessMsg(null);
		setPinCopied(false);
		setLinkCopied(false);
		setRetrievedData(null);
		setDropText("");
		setFiles([]);
		setPin("");
		setPinPasted(false);
		setUploadProgress(0);
		setIsZipDownloaded(false);
	};

	const onDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const onDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const onDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
		}
	}, []);

	const removeFile = (indexToRemove: number) => {
		setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
	};

	useEffect(() => {
		const handlePaste = (e: ClipboardEvent) => {
			// Only intercept paste if we are on the DROP tab
			if (tabIndex !== 0) return;

			const items = e.clipboardData?.items;
			if (!items) return;

			const pastedFiles: File[] = [];
			for (let i = 0; i < items.length; i++) {
				if (items[i].kind === "file") {
					const file = items[i].getAsFile();
					if (file) pastedFiles.push(file);
				}
			}

			if (pastedFiles.length > 0) {
				setFiles((prev) => [...prev, ...pastedFiles]);
			}
		};

		window.addEventListener("paste", handlePaste);
		return () => window.removeEventListener("paste", handlePaste);
	}, [tabIndex]);

	const handleDropSubmit = async () => {
		const totalSize = files.reduce((acc, file) => acc + file.size, 0);
		if (totalSize > MAX_FILE_SIZE_BYTES) {
			setError(
				`Total payload exceeds the 500MB limit. You are trying to upload ${formatBytes(totalSize)}.`,
			);
			return;
		}

		if (!dropText.trim() && files.length === 0) {
			setError("Payload cannot be completely empty.");
			return;
		}

		setIsLoading(true);
		setError(null);
		setUploadProgress(0);
		setPinCopied(false);
		setLinkCopied(false);

		const formData = new FormData();
		if (dropText.trim()) {
			formData.append("TextPayload", dropText);
		}
		files.forEach((file) => {
			formData.append("Files", file);
		});

		try {
			const result = await new Promise<any>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open("POST", API_BASE_URL);

				const passcode = getStoredPasscode();
				if (passcode) {
					xhr.setRequestHeader("X-Instance-Passcode", passcode);
				}

				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable) {
						const percentComplete = Math.round(
							(e.loaded / e.total) * 100,
						);
						setUploadProgress(percentComplete);
					}
				};

				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve(JSON.parse(xhr.responseText));
					} else {
						if (xhr.status === 401) {
							onUnauthorized?.();
						}
						if (xhr.status === 429) {
							reject(
								new Error(
									"Rate limit reached. Chuck has received too many requests from your network. Please wait a moment before trying again.",
								),
							);
							return;
						}
						let errorMsg = "Failed to communicate with Chuck.";
						try {
							const parsed = JSON.parse(xhr.responseText);
							errorMsg =
								parsed.message || parsed.title || errorMsg;
						} catch (e) {}
						reject(new Error(errorMsg));
					}
				};

				xhr.onerror = () =>
					reject(new Error("Network connection error."));
				xhr.send(formData);
			});

			setGeneratedPin(result.pin || result.Pin);
			setBurnToken(result.burnToken || result.BurnToken || null);
			setCancelSuccessMsg(null);
			setDropText("");
			setFiles([]);
		} catch (err: any) {
			setError(err.message);
			// Wipe the selected files so the malicious file doesn't linger in the UI
			setFiles([]);
		} finally {
			setIsLoading(false);
			setUploadProgress(0);
		}
	};

	const handleCancelDrop = async () => {
		if (!generatedPin) return;
		setIsCancellingDrop(true);
		setError(null);
		try {
			const url = burnToken
				? `${API_BASE_URL}/${generatedPin}?token=${burnToken}`
				: `${API_BASE_URL}/${generatedPin}`;
			const passcode = getStoredPasscode();
			const headers: Record<string, string> = {};
			if (passcode) {
				headers["X-Instance-Passcode"] = passcode;
			}
			const response = await fetch(url, { method: "DELETE", headers });
			if (!response.ok) {
				if (response.status === 401) {
					onUnauthorized?.();
				}
				if (response.status === 429) {
					throw new Error(
						"Rate limit reached. Please wait a moment before trying again.",
					);
				}
				const errData = await response.json().catch(() => null);
				throw new Error(errData?.message || "Failed to cancel drop.");
			}
			setGeneratedPin(null);
			setBurnToken(null);
			setCancelSuccessMsg(
				"Drop cancelled and permanently burnt from server.",
			);
			setTimeout(() => setCancelSuccessMsg(null), 8000);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setIsCancellingDrop(false);
		}
	};

	const handlePastePin = async () => {
		try {
			if (!navigator.clipboard?.readText) {
				setError("Clipboard access is not supported by your browser.");
				return;
			}
			const text = await navigator.clipboard.readText();
			const trimmed = text.trim();
			const pinParamMatch = trimmed.match(/[?&]pin=(\d{4})\b/i);
			const match =
				pinParamMatch ||
				trimmed.match(/\b\d{4}\b/) ||
				trimmed.match(/\d{4}/);
			const digits = pinParamMatch
				? pinParamMatch[1]
				: match
					? match[0]
					: trimmed.replace(/\D/g, "").slice(0, 4);

			if (digits) {
				setPin(digits);
				setError(null);
				setPinPasted(true);
				setTimeout(() => setPinPasted(false), 2000);
			} else {
				setError("No valid PIN found on clipboard.");
			}
		} catch {
			setError(
				"Unable to access clipboard. Please check browser permissions or paste manually.",
			);
		}
	};

	const retrieveDropByPin = useCallback(
		async (targetPin: string) => {
			if (targetPin.length !== 4) return;

			setIsLoading(true);
			setError(null);
			setRetrievedData(null);
			setTextCopied(false);
			setIsZipDownloaded(false);
			setIsBurningAll(false);

			try {
				const passcode = getStoredPasscode();
				const headers: Record<string, string> = {};
				if (passcode) {
					headers["X-Instance-Passcode"] = passcode;
				}
				const response = await fetch(`${API_BASE_URL}/${targetPin}`, {
					headers,
				});
				if (!response.ok) {
					if (response.status === 401) {
						pendingUrlPinRef.current = targetPin;
						onUnauthorized?.();
					}
					if (response.status === 429) {
						throw new Error(
							"Rate limit reached. Chuck has received too many requests from your network. Please wait a moment before trying again.",
						);
					}
					const errData = await response.json().catch(() => null);
					throw new Error(
						errData?.message || "Failed to retrieve payload.",
					);
				}
				const data = await response.json();
				setRetrievedData(data);
				setPin("");
			} catch (err: any) {
				setError(err.message);
			} finally {
				setIsLoading(false);
			}
		},
		[onUnauthorized],
	);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const rawPin = params.get("pin")?.trim() ?? "";
		if (/^\d{4}$/.test(rawPin)) {
			pendingUrlPinRef.current = rawPin;
			setTabIndex(1);
			setPin(rawPin);

			params.delete("pin");
			const remainingSearch = params.toString();
			const cleanUrl = `${window.location.pathname}${remainingSearch ? `?${remainingSearch}` : ""}${window.location.hash}`;
			window.history.replaceState({}, "", cleanUrl);
		}
	}, []);

	useEffect(() => {
		if (isUnlocked && pendingUrlPinRef.current) {
			const targetPin = pendingUrlPinRef.current;
			pendingUrlPinRef.current = null;
			void retrieveDropByPin(targetPin);
		}
	}, [isUnlocked, retrieveDropByPin]);

	const handleRetrieveSubmit = async (e?: React.FormEvent) => {
		if (e) {
			e.preventDefault();
		}
		if (pin.length !== 4 || isLoading) return;
		await retrieveDropByPin(pin);
	};

	const onFileBurnt = (burntId: string) => {
		setRetrievedData((prev: any) => {
			if (!prev) return prev;
			return {
				...prev,
				files: prev.files.filter((f: any) => f.id !== burntId),
			};
		});
	};

	const handleDownloadAll = () => {
		if (!retrievedData || !retrievedData.zipUrl) return;

		setIsPreparingZip(true);

		const token = Date.now().toString();
		const connector = retrievedData.zipUrl.includes("?") ? "&" : "?";
		const passcode = getStoredPasscode();
		const passcodeParam = passcode ? `&passcode=${encodeURIComponent(passcode)}` : "";

		const link = document.createElement("a");
		link.href = `${retrievedData.zipUrl}${connector}token=${token}${passcodeParam}`;
		link.download = "Chuck-Payload.zip";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		const interval = setInterval(async () => {
			try {
				const headers: Record<string, string> = {};
				if (passcode) {
					headers["X-Instance-Passcode"] = passcode;
				}
				const response = await fetch(`${API_BASE_URL}/status/${token}`, { headers });
				if (response.ok) {
					setIsPreparingZip(false);
					setIsZipDownloaded(true); // Tell the UI the zip has successfully triggered
					clearInterval(interval);
				}
			} catch (e) {
				// Ignore network errors during polling
			}
		}, 500);

		// Failsafe: Turn off after 30 seconds
		setTimeout(() => {
			setIsPreparingZip(false);
			setIsZipDownloaded(true);
			clearInterval(interval);
		}, 30000);
	};

	// Atomic or Concurrent Burn All function
	const handleBurnAll = async () => {
		if (!retrievedData) return;
		setIsBurningAll(true);
		try {
			const passcode = getStoredPasscode();
			const headers: Record<string, string> = {};
			if (passcode) {
				headers["X-Instance-Passcode"] = passcode;
			}

			if (retrievedData.burnUrl) {
				// Atomic drop purge
				const response = await fetch(retrievedData.burnUrl, {
					method: "DELETE",
					headers,
				});
				if (!response.ok) throw new Error("Failed to burn drop.");
			} else if (retrievedData.files) {
				// Fallback for individual file burns
				await Promise.all(
					retrievedData.files.map((f: any) =>
						fetch(f.burnUrl, { method: "DELETE", headers }),
					),
				);
			}
			// Wipe the UI to return to the PIN entry screen
			setRetrievedData(null);
		} catch (err) {
			setError("Failed to burn payload from server.");
		} finally {
			setIsBurningAll(false);
		}
	};

	return (
		<Paper elevation={4} sx={{ borderRadius: 3, overflow: "hidden" }}>
			<Tabs
				value={tabIndex}
				onChange={handleTabChange}
				variant="fullWidth"
				indicatorColor="primary"
				textColor="primary"
			>
				<Tab icon={<CloudUploadIcon />} label="DROP" sx={{ py: 2 }} />
				<Tab icon={<DownloadIcon />} label="RETRIEVE" sx={{ py: 2 }} />
			</Tabs>

			<Box sx={{ p: 4, minHeight: 400 }}>
				{error && (
					<Alert severity="error" sx={{ mb: 3 }}>
						{error}
					</Alert>
				)}
				{cancelSuccessMsg && (
					<Alert
						severity="info"
						sx={{ mb: 3 }}
						onClose={() => setCancelSuccessMsg(null)}
					>
						{cancelSuccessMsg}
					</Alert>
				)}

				{tabIndex === 0 && (
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 3,
							animation: "fadeIn 0.3s ease-in",
						}}
					>
						{generatedPin ? (
							<Alert
								severity="success"
								icon={false}
								sx={{
									"& .MuiAlert-message": {
										width: "100%",
										textAlign: "center",
									},
								}}
							>
								<Typography
									variant="body1"
									color="text.secondary"
								>
									Payload secured. Your temporary PIN is:
								</Typography>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: 1,
										mt: 2,
									}}
								>
									<Typography
										variant="h2"
										sx={{
											letterSpacing: 8,
											fontWeight: "bold",
										}}
									>
										{generatedPin}
									</Typography>
									<Tooltip
										title={
											pinCopied ? "Copied!" : "Copy PIN"
										}
										placement="top"
									>
										<IconButton
											onClick={async () => {
												await navigator.clipboard.writeText(
													generatedPin,
												);
												setPinCopied(true);
												setTimeout(
													() => setPinCopied(false),
													2000,
												);
											}}
											size="large"
											color={
												pinCopied
													? "success"
													: "default"
											}
										>
											{pinCopied ? (
												<CheckIcon fontSize="inherit" />
											) : (
												<ContentCopyIcon fontSize="inherit" />
											)}
										</IconButton>
									</Tooltip>
								</Box>
								<Box
									sx={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										mt: 2.5,
										gap: 1.5,
									}}
								>
									<Box
										sx={{
											p: 1.5,
											bgcolor: "#ffffff",
											borderRadius: 2,
											display: "inline-flex",
											boxShadow: 2,
										}}
									>
										<QRCodeSVG
											value={getQuickCatchUrl(
												generatedPin,
											)}
											size={148}
											level="M"
											role="img"
											aria-label={`QR code for PIN ${generatedPin}`}
										/>
									</Box>
									<Typography
										variant="caption"
										color="text.secondary"
										sx={{ maxWidth: 280 }}
									>
										Scan with your phone camera or copy the
										Quick-Catch link for instant retrieval.
									</Typography>
									<Button
										variant="outlined"
										size="small"
										color={
											linkCopied ? "success" : "primary"
										}
										startIcon={
											linkCopied ? (
												<CheckIcon />
											) : (
												<LinkIcon />
											)
										}
										onClick={async () => {
											await navigator.clipboard.writeText(
												getQuickCatchUrl(generatedPin),
											);
											setLinkCopied(true);
											setTimeout(
												() => setLinkCopied(false),
												2000,
											);
										}}
									>
										{linkCopied
											? "Link Copied!"
											: "Copy Quick-Catch Link"}
									</Button>
								</Box>
								<Box
									sx={{
										display: "flex",
										justifyContent: "center",
										gap: 2,
										mt: 3,
									}}
								>
									<Button
										variant="outlined"
										color="success"
										onClick={() => setGeneratedPin(null)}
									>
										Drop Another
									</Button>
									<Button
										variant="outlined"
										color="error"
										startIcon={
											isCancellingDrop ? (
												<CircularProgress
													size={16}
													color="inherit"
												/>
											) : (
												<LocalFireDepartmentIcon />
											)
										}
										onClick={handleCancelDrop}
										disabled={isCancellingDrop}
									>
										Cancel Drop
									</Button>
								</Box>
							</Alert>
						) : (
							<>
								<TextField
									multiline
									rows={3}
									variant="outlined"
									placeholder="Paste text here..."
									fullWidth
									value={dropText}
									onChange={(e) =>
										setDropText(e.target.value)
									}
									disabled={isLoading}
								/>

								{/* Drag and Drop Box */}
								<Box
									onDragOver={onDragOver}
									onDragLeave={onDragLeave}
									onDrop={onDrop}
									sx={{
										border: "2px dashed",
										borderColor: isDragging
											? "primary.main"
											: "divider",
										borderRadius: 2,
										p: 3,
										textAlign: "center",
										bgcolor: isDragging
											? "action.hover"
											: "background.paper",
										transition: "all 0.2s ease",
										cursor: "pointer",
									}}
									onClick={() =>
										document
											.getElementById("file-input")
											?.click()
									}
								>
									<input
										type="file"
										id="file-input"
										multiple
										style={{ display: "none" }}
										onChange={(e) => {
											if (e.target.files)
												setFiles((prev) => [
													...prev,
													...Array.from(
														e.target.files!,
													),
												]);
										}}
									/>
									<CloudUploadIcon
										sx={{
											fontSize: 48,
											color: "text.secondary",
											mb: 1,
										}}
									/>
									<Typography
										variant="body1"
										color="text.secondary"
									>
										Drag & Drop files here, or click to
										browse.
									</Typography>
									<Typography
										variant="caption"
										color="text.secondary"
									>
										(You can also paste images directly from
										your clipboard)
									</Typography>
								</Box>

								{/* Selected Files List */}
								{files.length > 0 && (
									<List
										dense
										sx={{
											bgcolor: "background.default",
											borderRadius: 1,
										}}
									>
										{files.map((file, index) => {
											const isImage =
												file.type.startsWith("image/");
											return (
												<ListItem
													key={index}
													secondaryAction={
														<IconButton
															edge="end"
															color="error"
															onClick={() =>
																removeFile(
																	index,
																)
															}
														>
															<DeleteIcon />
														</IconButton>
													}
												>
													<ListItemAvatar>
														{isImage ? (
															<Avatar
																src={URL.createObjectURL(
																	file,
																)}
																variant="rounded"
															/>
														) : (
															<Avatar
																sx={{
																	bgcolor:
																		"background.paper",
																	color: "primary.main",
																}}
															>
																{getFileIcon(
																	file.type,
																)}
															</Avatar>
														)}
													</ListItemAvatar>
													<Tooltip
														title={file.name}
														placement="top-start"
														arrow
													>
														<ListItemText
															primary={
																<Typography
																	sx={{
																		whiteSpace:
																			"nowrap",
																		overflow:
																			"hidden",
																		textOverflow:
																			"ellipsis",
																	}}
																>
																	{file.name}
																</Typography>
															}
															secondary={formatBytes(
																file.size,
															)}
															sx={{
																pr: 5,
																cursor: "default",
															}}
														/>
													</Tooltip>
												</ListItem>
											);
										})}
									</List>
								)}

								<Box sx={{ position: "relative", mt: 2 }}>
									<Button
										variant="contained"
										size="large"
										fullWidth
										onClick={handleDropSubmit}
										disabled={
											(dropText.trim() === "" &&
												files.length === 0) ||
											isLoading
										}
										sx={{ py: 1.5, fontWeight: "bold" }}
									>
										{isLoading
											? `Uploading... ${uploadProgress}%`
											: "Chuck It"}
									</Button>
									{isLoading && (
										<LinearProgress
											variant="determinate"
											value={uploadProgress}
											sx={{
												position: "absolute",
												bottom: 0,
												left: 0,
												right: 0,
												borderBottomLeftRadius: 4,
												borderBottomRightRadius: 4,
											}}
										/>
									)}
								</Box>
							</>
						)}
					</Box>
				)}

				{tabIndex === 1 && (
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							gap: 3,
							animation: "fadeIn 0.3s ease-in",
						}}
					>
						{retrievedData ? (
							<Box sx={{ textAlign: "left" }}>
								<Typography
									variant="body2"
									align="center"
									color="success.main"
									gutterBottom
								>
									Payload Caught!
								</Typography>

								{retrievedData.text && (
									<Paper
										elevation={2}
										sx={{
											position: "relative",
											bgcolor: "background.default",
											mb: 3,
											borderRadius: 2,
											overflow: "hidden",
										}}
									>
										<Box
											sx={{
												position: "absolute",
												top: 8,
												right: 24,
												zIndex: 2,
												bgcolor: "background.paper",
												borderRadius: 1,
												boxShadow: 1,
											}}
										>
											<Tooltip
												title={
													textCopied
														? "Copied!"
														: "Copy to clipboard"
												}
												placement="top"
											>
												<IconButton
													onClick={async () => {
														await navigator.clipboard.writeText(
															retrievedData.text,
														);
														setTextCopied(true);
														setTimeout(
															() =>
																setTextCopied(
																	false,
																),
															2000,
														);
													}}
													size="small"
													color={
														textCopied
															? "success"
															: "default"
													}
												>
													{textCopied ? (
														<CheckIcon fontSize="small" />
													) : (
														<ContentCopyIcon fontSize="small" />
													)}
												</IconButton>
											</Tooltip>
										</Box>
										<Box
											component="pre"
											sx={{
												m: 0,
												p: 2,
												pt: 4.5,
												fontFamily:
													'Consolas, Monaco, "Courier New", monospace',
												fontSize: "0.875rem",
												lineHeight: 1.6,
												whiteSpace: "pre",
												overflowX: "auto",
												overflowY: "auto",
												maxHeight: "280px",
												tabSize: 4,
											}}
										>
											{retrievedData.text}
										</Box>
									</Paper>
								)}

								{retrievedData.files &&
									retrievedData.files.length > 0 && (
										<>
											<Box
												sx={{
													display: "flex",
													justifyContent:
														"space-between",
													alignItems: "center",
													mb: 1,
												}}
											>
												<Typography
													variant="subtitle2"
													color="text.secondary"
												>
													Attached Files
												</Typography>
												{retrievedData.files.length >
													1 && (
													<Box
														sx={{
															display: "flex",
															gap: 1,
														}}
													>
														<Button
															size="small"
															variant={
																isZipDownloaded
																	? "outlined"
																	: "text"
															}
															onClick={
																handleDownloadAll
															}
															disabled={
																isPreparingZip
															}
															startIcon={
																isPreparingZip ? (
																	<CircularProgress
																		size={
																			16
																		}
																		color="inherit"
																	/>
																) : isZipDownloaded ? (
																	<DownloadIcon />
																) : null
															}
														>
															{isPreparingZip
																? "Starting..."
																: isZipDownloaded
																	? "Download All Again"
																	: "Download All"}
														</Button>
														{isZipDownloaded && (
															<Button
																size="small"
																variant="contained"
																color="error"
																onClick={
																	handleBurnAll
																}
																disabled={
																	isBurningAll
																}
																startIcon={
																	isBurningAll ? (
																		<CircularProgress
																			size={
																				16
																			}
																			color="inherit"
																		/>
																	) : (
																		<LocalFireDepartmentIcon />
																	)
																}
															>
																Burn All
															</Button>
														)}
													</Box>
												)}
											</Box>
											<List
												dense
												sx={{
													bgcolor:
														"background.default",
													borderRadius: 2,
													mb: 3,
												}}
											>
												{retrievedData.files.map(
													(f: any, idx: number) => (
														<React.Fragment
															key={f.id}
														>
															<RetrievedFileRow
																file={f}
																onBurnt={
																	onFileBurnt
																}
															/>
															{idx <
																retrievedData
																	.files
																	.length -
																	1 && (
																<Divider component="li" />
															)}
														</React.Fragment>
													),
												)}
											</List>
										</>
									)}

								<Box sx={{ display: "flex", gap: 2, mt: 2 }}>
									<Button
										variant="outlined"
										fullWidth
										onClick={() => setRetrievedData(null)}
									>
										Catch Another
									</Button>
									{retrievedData.burnUrl && (
										<Button
											variant="contained"
											color="error"
											fullWidth
											startIcon={
												isBurningAll ? (
													<CircularProgress
														size={16}
														color="inherit"
													/>
												) : (
													<LocalFireDepartmentIcon />
												)
											}
											onClick={handleBurnAll}
											disabled={isBurningAll}
										>
											Burn Drop
										</Button>
									)}
								</Box>
							</Box>
						) : (
							<Box
								component="form"
								onSubmit={handleRetrieveSubmit}
								noValidate
								sx={{
									display: "flex",
									flexDirection: "column",
									gap: 3,
								}}
							>
								<Typography
									variant="body1"
									align="center"
									color="text.secondary"
								>
									Enter your 4-digit PIN to retrieve your
									payload.
								</Typography>
								<TextField
									variant="outlined"
									placeholder="e.g. 1234"
									fullWidth
									value={pin}
									onChange={(e) => {
										setPin(
											e.target.value
												.replace(/\D/g, "")
												.slice(0, 4),
										);
										setError(null);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											if (
												e.nativeEvent.isComposing ||
												(e.nativeEvent as KeyboardEvent).keyCode === 229
											)
												return;
											e.preventDefault();
											if (
												pin.length === 4 &&
												!isLoading
											) {
												handleRetrieveSubmit();
											}
										}
									}}
									disabled={isLoading}
									slotProps={{
										htmlInput: {
											inputMode: "numeric",
											pattern: "[0-9]*",
											maxLength: 4,
											enterKeyHint: "go",
										},
										input: {
											startAdornment: (
												<InputAdornment
													position="start"
													sx={{
														visibility: "hidden",
														pointerEvents: "none",
													}}
												>
													<IconButton
														tabIndex={-1}
														aria-hidden="true"
														disabled
														size="medium"
													>
														<ContentPasteIcon />
													</IconButton>
												</InputAdornment>
											),
											endAdornment: (
												<InputAdornment position="end">
													<Tooltip
														title={
															pinPasted
																? "Pasted!"
																: "Paste PIN"
														}
														placement="top"
													>
														<span>
															<IconButton
																onClick={handlePastePin}
																edge="end"
																disabled={isLoading}
																color={
																	pinPasted
																		? "success"
																		: "default"
																}
																aria-label="Paste PIN from clipboard"
																size="medium"
															>
																{pinPasted ? (
																	<CheckIcon fontSize="inherit" />
																) : (
																	<ContentPasteIcon fontSize="inherit" />
																)}
															</IconButton>
														</span>
													</Tooltip>
												</InputAdornment>
											),
										},
									}}
									sx={{
										"& .MuiInputBase-input": {
											textAlign: "center",
											fontSize: "1.5rem",
											letterSpacing: "0.5rem",
											paddingLeft: "0.5rem",
										},
									}}
								/>
								<Button
									type="submit"
									variant="contained"
									size="large"
									fullWidth
									disabled={pin.length < 4 || isLoading}
									sx={{ py: 1.5, fontWeight: "bold" }}
								>
									{isLoading ? (
										<CircularProgress
											size={24}
											color="inherit"
										/>
									) : (
										"Catch It"
									)}
								</Button>
							</Box>
						)}
					</Box>
				)}
			</Box>
		</Paper>
	);
}
