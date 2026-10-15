import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		// This tells Vite to intercept specific requests
		proxy: {
			"/api": {
				target: "http://localhost:5075", // Your C# local debug port
				changeOrigin: true,
				secure: false,
			},
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./src/setupTests.ts",
		testTimeout: 20000,
	},
});
