import React from "react";
import {
	Paper,
	Box,
	Typography,
	Button,
	CircularProgress,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import chuckStop from "../assets/chuck_stop.jpg";

interface RateLimitCardProps {
	onRetry: () => void;
	isRetrying?: boolean;
}

export const RateLimitCard: React.FC<RateLimitCardProps> = ({
	onRetry,
	isRetrying = false,
}) => {
	return (
		<Paper
			elevation={4}
			sx={{
				borderRadius: 3,
				p: { xs: 3, sm: 4 },
				textAlign: "center",
				bgcolor: "background.paper",
			}}
		>
			<Box
				component="img"
				src={chuckStop}
				alt="Chuck Stop"
				sx={{
					width: "100%",
					maxWidth: { xs: 260, sm: 300 },
					height: "auto",
					display: "block",
					margin: "0 auto",
					borderRadius: 2,
					mb: 3,
					boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
					userSelect: "none",
				}}
			/>

			<Typography
				variant="h5"
				component="h2"
				sx={{ fontWeight: 700, mb: 1, letterSpacing: 0.5 }}
			>
				Too Many Requests
			</Typography>

			<Typography
				variant="body2"
				color="text.secondary"
				sx={{ mb: 3.5, maxWidth: 380, mx: "auto", lineHeight: 1.6 }}
			>
				Chuck&apos;s rate limiter has been triggered. Too many requests
				have been received from your network. Please wait a moment for
				the cooldown window to reset before retrying.
			</Typography>

			<Button
				variant="contained"
				color="primary"
				size="large"
				onClick={onRetry}
				disabled={isRetrying}
				startIcon={
					isRetrying ? (
						<CircularProgress size={20} color="inherit" />
					) : (
						<RefreshIcon />
					)
				}
				sx={{
					py: 1.2,
					px: 4,
					fontWeight: 700,
					borderRadius: 2,
					textTransform: "none",
					fontSize: "1rem",
				}}
			>
				{isRetrying ? "Checking..." : "Try Again"}
			</Button>
		</Paper>
	);
};
