import { useState, useEffect, useCallback } from "react";
import {
	ThemeProvider,
	createTheme,
	CssBaseline,
	Container,
	Box,
	Typography,
	IconButton,
	Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import chuckIcon from "./assets/chuck_icon.png";
import { TransferHub } from "./components/TransferHub";
import { NavigationDrawer } from "./components/NavigationDrawer";
import { PasscodeLockModal } from "./components/PasscodeLockModal";
import { OfflineCard } from "./components/OfflineCard";
import { RateLimitCard } from "./components/RateLimitCard";
import { NetworkRestrictedCard } from "./components/NetworkRestrictedCard";
import { getStoredPasscode, clearStoredPasscode } from "./utils/passcodeUtils";

const darkTheme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: "#ff9800",
		},
		background: {
			default: "#121212",
			paper: "#1e1e1e",
		},
	},
	typography: {
		fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
	},
});

// Mirrors the server default (ChuckSettings:MaxPayloadSizeBytes) until /api/config reports the instance's real limit
const DEFAULT_MAX_PAYLOAD_SIZE_BYTES = 524288000;

export default function App() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [isPasscodeProtected, setIsPasscodeProtected] = useState(false);
	const [isUnlocked, setIsUnlocked] = useState(true);
	const [isConfigLoaded, setIsConfigLoaded] = useState(false);
	const [lockModalOpen, setLockModalOpen] = useState(false);
	const [isServerUnreachable, setIsServerUnreachable] = useState(false);
	const [isRateLimited, setIsRateLimited] = useState(false);
	const [isNetworkRestricted, setIsNetworkRestricted] = useState(false);
	const [maxPayloadSizeBytes, setMaxPayloadSizeBytes] = useState(
		DEFAULT_MAX_PAYLOAD_SIZE_BYTES,
	);
	const [isRetrying, setIsRetrying] = useState(false);

	const checkConnection = useCallback(async (isManualRetry = false) => {
		if (isManualRetry) {
			setIsRetrying(true);
		}
		try {
			const res = await fetch("/api/config");
			if (res.status === 429) {
				setIsRateLimited(true);
				setIsNetworkRestricted(false);
				setIsServerUnreachable(false);
				setLockModalOpen(false);
				return;
			}
			if (res.status === 403) {
				// ChuckSettings:AllowedNetworks rejected this visitor's network
				setIsNetworkRestricted(true);
				setIsRateLimited(false);
				setIsServerUnreachable(false);
				setLockModalOpen(false);
				return;
			}
			if (!res.ok) {
				throw new Error(`Server returned ${res.status}`);
			}
			const data = await res.json();
			setIsServerUnreachable(false);
			setIsRateLimited(false);
			setIsNetworkRestricted(false);

			if (
				data &&
				typeof data.maxPayloadSizeBytes === "number" &&
				data.maxPayloadSizeBytes > 0
			) {
				setMaxPayloadSizeBytes(data.maxPayloadSizeBytes);
			}

			if (data && data.isPasscodeProtected) {
				setIsPasscodeProtected(true);
				const stored = getStoredPasscode();
				if (!stored) {
					setIsUnlocked(false);
					setLockModalOpen(true);
				} else {
					setIsUnlocked(true);
					setLockModalOpen(false);
				}
			} else {
				setIsPasscodeProtected(false);
				setIsUnlocked(true);
				setLockModalOpen(false);
			}
		} catch {
			setIsRateLimited(false);
			setIsNetworkRestricted(false);
			setIsServerUnreachable(true);
			setLockModalOpen(false);
		} finally {
			setIsConfigLoaded(true);
			if (isManualRetry) {
				setIsRetrying(false);
			}
		}
	}, []);

	useEffect(() => {
		checkConnection();
	}, [checkConnection]);

	// Auto-retry connection every 5 seconds if server is unreachable (do not poll when rate limited)
	useEffect(() => {
		if (!isServerUnreachable || isRateLimited || isNetworkRestricted) return;
		const interval = setInterval(() => {
			checkConnection();
		}, 5000);
		return () => clearInterval(interval);
	}, [isServerUnreachable, isRateLimited, isNetworkRestricted, checkConnection]);

	const handleLockInstance = () => {
		clearStoredPasscode();
		setIsUnlocked(false);
		setLockModalOpen(true);
	};

	const handleRateLimited = useCallback(() => {
		setIsRateLimited(true);
		setIsServerUnreachable(false);
		setLockModalOpen(false);
	}, []);

	const handleNetworkRestricted = useCallback(() => {
		setIsNetworkRestricted(true);
		setIsServerUnreachable(false);
		setLockModalOpen(false);
	}, []);

	return (
		<ThemeProvider theme={darkTheme}>
			<CssBaseline />

			{/* Top Bar with Hamburger Menu & Quick Lock */}
			<Box
				component="header"
				sx={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					p: { xs: 1.5, sm: 2.5 },
					zIndex: 10,
				}}
			>
				<Tooltip title="Menu & Info">
					<IconButton
						onClick={() => setDrawerOpen(true)}
						aria-label="open navigation menu"
						sx={{
							color: "text.secondary",
							"&:hover": {
								color: "primary.main",
								bgcolor: "rgba(255, 152, 0, 0.08)",
							},
						}}
					>
						<MenuIcon fontSize="medium" />
					</IconButton>
				</Tooltip>

				{isPasscodeProtected && isUnlocked && !isServerUnreachable && (
					<Tooltip title="Lock Instance (Clear Session)">
						<IconButton
							onClick={handleLockInstance}
							aria-label="lock instance"
							sx={{
								color: "text.secondary",
								"&:hover": {
									color: "warning.main",
									bgcolor: "rgba(255, 152, 0, 0.08)",
								},
							}}
						>
							<LockOutlinedIcon fontSize="medium" />
						</IconButton>
					</Tooltip>
				)}
			</Box>

			{/* Main Content */}
			<Container
				maxWidth="sm"
				sx={{ position: "relative", pt: { xs: 6, sm: 8 }, pb: 6 }}
			>
				<Box sx={{ mb: 4, textAlign: "center" }}>
					<Box
						sx={{
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 1.5,
							mb: 0.5,
						}}
					>
						<Box
							component="img"
							src={chuckIcon}
							alt="Chuck Logo"
							sx={{
								width: { xs: 44, sm: 52 },
								height: { xs: 44, sm: 52 },
								userSelect: "none",
								display: "block",
							}}
						/>
						<Typography
							variant="h3"
							color="primary"
							sx={{
								fontWeight: "bold",
								letterSpacing: 2,
								lineHeight: 1,
							}}
						>
							CHUCK
						</Typography>
					</Box>
					<Typography variant="subtitle1" color="text.secondary">
						The ephemeral transfer hub.
					</Typography>
				</Box>

				{isRateLimited ? (
					<RateLimitCard
						onRetry={() => checkConnection(true)}
						isRetrying={isRetrying}
					/>
				) : isNetworkRestricted ? (
					<NetworkRestrictedCard
						onRetry={() => checkConnection(true)}
						isRetrying={isRetrying}
					/>
				) : isServerUnreachable ? (
					<OfflineCard
						onRetry={() => checkConnection(true)}
						isRetrying={isRetrying}
					/>
				) : (
					<TransferHub
						onUnauthorized={handleLockInstance}
						onRateLimited={handleRateLimited}
						onNetworkRestricted={handleNetworkRestricted}
						maxPayloadSizeBytes={maxPayloadSizeBytes}
						isUnlocked={isConfigLoaded && isUnlocked}
					/>
				)}
			</Container>

			{/* Slide-out Navigation Drawer & Modals */}
			<NavigationDrawer
				open={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				isPasscodeProtected={isPasscodeProtected}
				onLockInstance={handleLockInstance}
			/>

			{/* Instance Passcode Lock Modal */}
			<PasscodeLockModal
				open={lockModalOpen}
				onUnlocked={() => {
					setIsUnlocked(true);
					setLockModalOpen(false);
				}}
				onRateLimited={handleRateLimited}
			/>
		</ThemeProvider>
	);
}
