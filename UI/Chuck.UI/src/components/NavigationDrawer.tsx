import React, { useState } from "react";
import {
	Drawer,
	Box,
	Typography,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Divider,
	Chip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Link,
	Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlinedIcon from "@mui/icons-material/HelpOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SecurityIcon from "@mui/icons-material/Security";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import chuckIcon from "../assets/chuck_icon.png";
import tfoxLogo from "../assets/tfox_logo_small.png";
import chuckJpg from "../assets/chuck.jpg";

interface NavigationDrawerProps {
	open: boolean;
	onClose: () => void;
	isPasscodeProtected?: boolean;
	onLockInstance?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
	open,
	onClose,
	isPasscodeProtected,
	onLockInstance,
}) => {
	const [activeModal, setActiveModal] = useState<
		"help" | "about" | "privacy" | null
	>(null);

	const handleOpenModal = (modal: "help" | "about" | "privacy") => {
		setActiveModal(modal);
		onClose();
	};

	const handleCloseModal = () => {
		setActiveModal(null);
	};

	return (
		<>
			<Drawer
				anchor="left"
				open={open}
				onClose={onClose}
				slotProps={{
					paper: {
						sx: {
							width: { xs: 280, sm: 340 },
							display: "flex",
							flexDirection: "column",
							bgcolor: "background.paper",
						},
					},
				}}
			>
				{/* Drawer Header */}
				<Box
					sx={{
						p: 2,
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<Box
						sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
					>
						<Box
							component="img"
							src={chuckIcon}
							alt="Chuck Logo"
							sx={{ width: 36, height: 36, userSelect: "none" }}
						/>
						<Box>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1,
								}}
							>
								<Typography
									variant="h6"
									color="primary"
									sx={{
										fontWeight: "bold",
										letterSpacing: 1,
										lineHeight: 1.1,
									}}
								>
									CHUCK
								</Typography>
								<Chip
									label="v1.0.5"
									size="small"
									variant="outlined"
									color="primary"
									sx={{ height: 20, fontSize: "0.65rem" }}
								/>
							</Box>
							<Typography
								variant="caption"
								color="text.secondary"
							>
								The ephemeral transfer hub
							</Typography>
						</Box>
					</Box>
					<IconButton
						onClick={onClose}
						size="small"
						aria-label="close drawer"
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				</Box>

				<Divider />

				{/* Navigation List */}
				<List sx={{ px: 1, py: 1.5 }}>
					<ListItem disablePadding>
						<ListItemButton
							onClick={() => handleOpenModal("help")}
							sx={{ borderRadius: 1.5, mb: 0.5 }}
						>
							<ListItemIcon
								sx={{ minWidth: 40, color: "primary.main" }}
							>
								<HelpOutlinedIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText
								primary="How It Works"
								slotProps={{
									primary: {
										sx: {
											typography: "body2",
											fontWeight: 600,
										},
									},
									secondary: {
										sx: { typography: "caption" },
									},
								}}
								secondary="Quick 3-step transfer guide"
							/>
						</ListItemButton>
					</ListItem>

					<ListItem disablePadding>
						<ListItemButton
							onClick={() => handleOpenModal("about")}
							sx={{ borderRadius: 1.5, mb: 0.5 }}
						>
							<ListItemIcon
								sx={{ minWidth: 40, color: "primary.main" }}
							>
								<InfoOutlinedIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText
								primary="About Chuck"
								slotProps={{
									primary: {
										sx: {
											typography: "body2",
											fontWeight: 600,
										},
									},
									secondary: {
										sx: { typography: "caption" },
									},
								}}
								secondary="Philosophy & architecture"
							/>
						</ListItemButton>
					</ListItem>

					<ListItem disablePadding>
						<ListItemButton
							onClick={() => handleOpenModal("privacy")}
							sx={{ borderRadius: 1.5, mb: 0.5 }}
						>
							<ListItemIcon
								sx={{ minWidth: 40, color: "primary.main" }}
							>
								<SecurityIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText
								primary="Privacy & Security"
								slotProps={{
									primary: {
										sx: {
											typography: "body2",
											fontWeight: 600,
										},
									},
									secondary: {
										sx: { typography: "caption" },
									},
								}}
								secondary="Zero-database & cookie-less"
							/>
						</ListItemButton>
					</ListItem>

					{isPasscodeProtected && onLockInstance && (
						<ListItem disablePadding>
							<ListItemButton
								onClick={() => {
									onClose();
									onLockInstance();
								}}
								sx={{ borderRadius: 1.5, mb: 0.5 }}
							>
								<ListItemIcon
									sx={{ minWidth: 40, color: "warning.main" }}
								>
									<LockOutlinedIcon fontSize="small" />
								</ListItemIcon>
								<ListItemText
									primary="Lock Instance"
									slotProps={{
										primary: {
											sx: {
												typography: "body2",
												fontWeight: 600,
											},
										},
										secondary: {
											sx: { typography: "caption" },
										},
									}}
									secondary="Clear passcode & lock session"
								/>
							</ListItemButton>
						</ListItem>
					)}
				</List>

				<Divider sx={{ mx: 2 }} />

				{/* External Links */}
				<List sx={{ px: 1, py: 1.5 }}>
					<ListItem disablePadding>
						<ListItemButton
							component="a"
							href="https://www.thorroldfox.com/"
							target="_blank"
							rel="noopener noreferrer"
							sx={{ borderRadius: 1.5 }}
						>
							<ListItemIcon
								sx={{ minWidth: 40, color: "text.secondary" }}
							>
								<OpenInNewIcon fontSize="small" />
							</ListItemIcon>
							<ListItemText
								primary="ThorroldFox"
								slotProps={{
									primary: {
										sx: {
											typography: "body2",
											fontWeight: 600,
										},
									},
									secondary: {
										sx: { typography: "caption" },
									},
								}}
								secondary="thorroldfox.com"
							/>
						</ListItemButton>
					</ListItem>
				</List>

				{/* Drawer Footer */}
				<Box
					sx={{
						mt: "auto",
						p: 2.5,
						textAlign: "center",
						borderTop: "1px solid",
						borderColor: "divider",
					}}
				>
					<Box
						component="a"
						href="https://www.thorroldfox.com/"
						target="_blank"
						rel="noopener noreferrer"
						sx={{
							display: "inline-flex",
							justifyContent: "center",
							alignItems: "center",
							mb: 1.5,
							transition: "opacity 0.2s, transform 0.2s",
							"&:hover": {
								opacity: 0.8,
								transform: "scale(1.04)",
							},
						}}
					>
						<Box
							component="img"
							src={tfoxLogo}
							alt="ThorroldFox Logo"
							sx={{
								width: 75,
								height: "auto",
								display: "block",
								margin: "0 auto",
								userSelect: "none",
							}}
						/>
					</Box>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ display: "block" }}
					>
						Chuck v1.0.5 • Clockwork Courier
					</Typography>
					<Typography
						variant="caption"
						color="text.disabled"
						sx={{ display: "block", mt: 0.5 }}
					>
						Developed by{" "}
						<Link
							href="https://www.thorroldfox.com/"
							target="_blank"
							rel="noopener noreferrer"
							color="primary"
							underline="hover"
						>
							ThorroldFox
						</Link>
					</Typography>
				</Box>
			</Drawer>

			{/* "How It Works" Dialog */}
			<Dialog
				open={activeModal === "help"}
				onClose={handleCloseModal}
				maxWidth="xs"
				fullWidth
				slotProps={{
					paper: {
						sx: { bgcolor: "background.paper" },
					},
				}}
			>
				<DialogTitle
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						pb: 1,
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<HelpOutlinedIcon color="primary" />
						<Typography variant="h6" sx={{ fontWeight: "bold" }}>
							How Chuck Works
						</Typography>
					</Box>
					<IconButton
						onClick={handleCloseModal}
						size="small"
						aria-label="close"
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers sx={{ borderColor: "divider" }}>
					<Stack spacing={2.5}>
						<Box
							sx={{
								display: "flex",
								gap: 2,
								alignItems: "flex-start",
							}}
						>
							<Box
								sx={{
									p: 1,
									borderRadius: 1,
									bgcolor: "action.hover",
									color: "primary.main",
									display: "flex",
								}}
							>
								<CloudUploadIcon />
							</Box>
							<Box>
								<Typography
									variant="subtitle2"
									sx={{ fontWeight: "bold" }}
								>
									1. Drop Payload
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
								>
									Drag and drop files or folders (up to 500
									MB), paste snippet text or clipboard images,
									and choose an auto-burn window (5, 10, or
									30 minutes).
								</Typography>
							</Box>
						</Box>

						<Box
							sx={{
								display: "flex",
								gap: 2,
								alignItems: "flex-start",
							}}
						>
							<Box
								sx={{
									p: 1,
									borderRadius: 1,
									bgcolor: "action.hover",
									color: "primary.main",
									display: "flex",
								}}
							>
								<VpnKeyIcon />
							</Box>
							<Box>
								<Typography
									variant="subtitle2"
									sx={{ fontWeight: "bold" }}
								>
									2. Share PIN or Scan QR
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
								>
									Chuck generates a temporary 4-digit PIN, a
									scannable QR code, and a Quick-Catch link
									for instant retrieval on your destination
									device.
								</Typography>
							</Box>
						</Box>

						<Box
							sx={{
								display: "flex",
								gap: 2,
								alignItems: "flex-start",
							}}
						>
							<Box
								sx={{
									p: 1,
									borderRadius: 1,
									bgcolor: "action.hover",
									color: "primary.main",
									display: "flex",
								}}
							>
								<LocalFireDepartmentIcon />
							</Box>
							<Box>
								<Typography
									variant="subtitle2"
									sx={{ fontWeight: "bold" }}
								>
									3. Catch & Burn
								</Typography>
								<Typography
									variant="body2"
									color="text.secondary"
								>
									Enter the PIN on the Catch tab to fetch your
									payload. Hit <strong>Burn Drop</strong> to
									immediately wipe the data from the server
									forever.
								</Typography>
							</Box>
						</Box>

						<Box
							sx={{
								p: 1.5,
								bgcolor: "action.hover",
								borderRadius: 1.5,
							}}
						>
							<Typography
								variant="caption"
								color="text.secondary"
								sx={{ display: "block" }}
							>
								⚡ <strong>Self-Destructing:</strong>{" "}
								Uncollected payloads expire automatically, while
								valid drops survive server restarts until
								retrieved or burnt.
							</Typography>
						</Box>
					</Stack>
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button
						onClick={handleCloseModal}
						variant="contained"
						color="primary"
						fullWidth
					>
						Got it
					</Button>
				</DialogActions>
			</Dialog>

			{/* "About Chuck" Dialog */}
			<Dialog
				open={activeModal === "about"}
				onClose={handleCloseModal}
				maxWidth="sm"
				fullWidth
				slotProps={{
					paper: {
						sx: { bgcolor: "background.paper" },
					},
				}}
			>
				<DialogTitle
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						pb: 1,
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<Box
							component="img"
							src={chuckIcon}
							alt="Chuck Logo"
							sx={{ width: 28, height: 28, userSelect: "none" }}
						/>
						<Typography variant="h6" sx={{ fontWeight: "bold" }}>
							About Chuck
						</Typography>
					</Box>
					<IconButton
						onClick={handleCloseModal}
						size="small"
						aria-label="close"
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers sx={{ borderColor: "divider" }}>
					<Stack spacing={2}>
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								mb: 0.5,
							}}
						>
							<Box
								component="img"
								src={chuckJpg}
								alt="Chuck"
								sx={{
									maxWidth: "100%",
									height: "auto",
									borderRadius: 2,
									display: "block",
									userSelect: "none",
								}}
							/>
						</Box>

						<Typography variant="body2">
							<strong>Chuck</strong> is a lightning-fast,
							zero-database, self-hosted web application
							engineered for one purpose: moving files and text
							securely between devices, and then burning the
							evidence.
						</Typography>

						<Typography
							variant="subtitle2"
							color="primary"
							sx={{ fontWeight: "bold" }}
						>
							Developed by ThorroldFox
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Chuck is designed and developed by{" "}
							<Link
								href="https://www.thorroldfox.com/"
								target="_blank"
								rel="noopener noreferrer"
								color="primary"
								underline="hover"
							>
								ThorroldFox
							</Link>
							. Learn more about our software and engineering
							projects at{" "}
							<Link
								href="https://www.thorroldfox.com/"
								target="_blank"
								rel="noopener noreferrer"
								color="primary"
								underline="hover"
							>
								www.thorroldfox.com
							</Link>
							.
						</Typography>

						<Typography
							variant="subtitle2"
							color="primary"
							sx={{ fontWeight: "bold" }}
						>
							The Ephemeral Promise
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Chuck does not use SQL, Redis, or permanent metadata
							databases. Active drops live in volatile server RAM
							backed by lightweight sidecars for reboot
							resilience, and are permanently shredded the moment
							they expire or are burnt.
						</Typography>

						<Typography
							variant="subtitle2"
							color="primary"
							sx={{ fontWeight: "bold" }}
						>
							On-The-Fly Zipping
						</Typography>
						<Typography variant="body2" color="text.secondary">
							When catching multiple files, Chuck dynamically
							streams them into a single <code>.zip</code> archive
							without consuming disk space or memory.
						</Typography>
					</Stack>
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button onClick={handleCloseModal} color="primary">
						Close
					</Button>
				</DialogActions>
			</Dialog>

			{/* "Privacy & Security" Dialog */}
			<Dialog
				open={activeModal === "privacy"}
				onClose={handleCloseModal}
				maxWidth="sm"
				fullWidth
				slotProps={{
					paper: {
						sx: { bgcolor: "background.paper" },
					},
				}}
			>
				<DialogTitle
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						pb: 1,
					}}
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<SecurityIcon color="primary" />
						<Typography variant="h6" sx={{ fontWeight: "bold" }}>
							Privacy & Security
						</Typography>
					</Box>
					<IconButton
						onClick={handleCloseModal}
						size="small"
						aria-label="close"
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers sx={{ borderColor: "divider" }}>
					<Stack spacing={2}>
						<Box>
							<Typography
								variant="subtitle2"
								sx={{ fontWeight: "bold" }}
								gutterBottom
							>
								Stateless & Cookie-Free
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Chuck does not use user accounts, tracking
								cookies, or browser storage for session
								profiling. Every interaction is isolated and
								anonymous.
							</Typography>
						</Box>

						<Box>
							<Typography
								variant="subtitle2"
								sx={{ fontWeight: "bold" }}
								gutterBottom
							>
								Zero IP Logging
							</Typography>
							<Typography variant="body2" color="text.secondary">
								We believe in total privacy. Chuck does not log,
								persist, or profile client IP addresses.
							</Typography>
						</Box>

						<Box>
							<Typography
								variant="subtitle2"
								sx={{ fontWeight: "bold" }}
								gutterBottom
							>
								Burn After Reading
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Once a payload is downloaded, a single click on
								"Burn Drop" permanently shreds the data from the
								server. There are no trash bins or recovery
								snapshots.
							</Typography>
						</Box>

						<Box>
							<Typography
								variant="subtitle2"
								sx={{ fontWeight: "bold" }}
								gutterBottom
							>
								Volatile Memory Architecture
							</Typography>
							<Typography variant="body2" color="text.secondary">
								No database backups exist. Expired or burnt
								payloads cannot be resurrected by
								anyone—including the server administrator.
							</Typography>
						</Box>
					</Stack>
				</DialogContent>
				<DialogActions sx={{ p: 2 }}>
					<Button onClick={handleCloseModal} color="primary">
						Close
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};
