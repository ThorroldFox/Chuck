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

interface NetworkRestrictedCardProps {
	onRetry: () => void;
	isRetrying?: boolean;
}

/**
 * Shown when the server rejects the visitor's network address (HTTP 403 from ChuckSettings:AllowedNetworks).
 * Offers a manual retry because the visitor may simply need to join the correct Wi-Fi network or VPN.
 */
export const NetworkRestrictedCard: React.FC<NetworkRestrictedCardProps> = ({
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
				Access Restricted
			</Typography>

			<Typography
				variant="body2"
				color="text.secondary"
				sx={{ mb: 3.5, maxWidth: 380, mx: "auto", lineHeight: 1.6 }}
			>
				This Chuck instance is restricted by network policy, and your
				current network is not permitted to use it.
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
