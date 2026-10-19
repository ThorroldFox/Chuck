import React, { useState } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Typography,
	TextField,
	Button,
	FormControlLabel,
	Checkbox,
	Alert,
	Box,
	IconButton,
	InputAdornment,
	CircularProgress,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { savePasscode } from "../utils/passcodeUtils";
import chuckStop from "../assets/chuck_stop.jpg";

interface PasscodeLockModalProps {
	open: boolean;
	onUnlocked: (passcode: string) => void;
	onRateLimited?: () => void;
}

export const PasscodeLockModal: React.FC<PasscodeLockModalProps> = ({
	open,
	onUnlocked,
	onRateLimited,
}) => {
	const [passcode, setPasscode] = useState("");
	const [remember, setRemember] = useState(false);
	const [showPasscode, setShowPasscode] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleVerify = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!passcode.trim() || isVerifying) return;

		setIsVerifying(true);
		setError(null);

		try {
			const response = await fetch("/api/config/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ passcode: passcode.trim() }),
			});

			if (response.ok) {
				savePasscode(passcode.trim(), remember);
				onUnlocked(passcode.trim());
				setPasscode("");
				setError(null);
			} else if (response.status === 401) {
				setError("Incorrect passcode. Please try again.");
			} else if (response.status === 429) {
				onRateLimited?.();
				setError(
					"Too many attempts. Rate limit reached. Please wait a moment before trying again.",
				);
			} else {
				setError("Failed to verify passcode. Please check your server connection.");
			}
		} catch {
			setError("Network error while verifying passcode.");
		} finally {
			setIsVerifying(false);
		}
	};

	return (
		<Dialog
			open={open}
			maxWidth="xs"
			fullWidth
			slotProps={{
				backdrop: {
					sx: { backdropFilter: "blur(6px)", bgcolor: "rgba(0, 0, 0, 0.75)" },
				},
			}}
		>
			<form onSubmit={handleVerify}>
				<DialogTitle sx={{ textAlign: "center", pt: 3, pb: 1 }}>
					<Box
						component="img"
						src={chuckStop}
						alt="Chuck Stop"
						sx={{
							width: "100%",
							maxWidth: { xs: 220, sm: 260 },
							height: "auto",
							display: "block",
							margin: "0 auto",
							borderRadius: 2,
							mb: 2,
							boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
							userSelect: "none",
						}}
					/>
					<Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
						Instance Locked
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
						This Chuck hub requires an access passcode to continue.
					</Typography>
				</DialogTitle>

				<DialogContent sx={{ px: 3, py: 1 }}>
					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					<TextField
						fullWidth
						autoFocus
						label="Instance Passcode"
						variant="outlined"
						type={showPasscode ? "text" : "password"}
						value={passcode}
						onChange={(e) => setPasscode(e.target.value)}
						disabled={isVerifying}
						slotProps={{
							input: {
								endAdornment: (
									<InputAdornment position="end">
										<IconButton
											onClick={() => setShowPasscode(!showPasscode)}
											edge="end"
											size="small"
											aria-label={showPasscode ? "hide passcode" : "show passcode"}
										>
											{showPasscode ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
										</IconButton>
									</InputAdornment>
								),
							},
						}}
						sx={{ mt: 1 }}
					/>

					<Box sx={{ mt: 2 }}>
						<FormControlLabel
							control={
								<Checkbox
									checked={remember}
									onChange={(e) => setRemember(e.target.checked)}
									color="primary"
									size="small"
								/>
							}
							label={
								<Typography variant="body2" sx={{ fontWeight: 500 }}>
									Remember on this device
								</Typography>
							}
						/>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block", pl: 3.5, mt: -0.5 }}
						>
							Persists across browser restarts. Do not use on shared or public computers.
						</Typography>
					</Box>
				</DialogContent>

				<DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
					<Button
						type="submit"
						variant="contained"
						fullWidth
						size="large"
						disabled={isVerifying || !passcode.trim()}
						startIcon={isVerifying ? <CircularProgress size={20} color="inherit" /> : null}
						sx={{ py: 1.2, fontWeight: 700, borderRadius: 2 }}
					>
						{isVerifying ? "Verifying..." : "Unlock"}
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};
