import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	
	// Optimize for real-time dashboard performance
	server: {
		port: 3000,
		host: true, // Allow external connections
		strictPort: true,
		// WebSocket proxy to backend API
		proxy: {
			'/api': {
				target: 'http://localhost:8080',
				changeOrigin: true,
				ws: true, // Enable WebSocket proxying
			},
			'/ws': {
				target: 'ws://localhost:8080',
				ws: true,
				changeOrigin: true,
			}
		}
	},
	
	build: {
		// Optimize bundle for production
		target: 'es2022',
		minify: 'terser',
		sourcemap: true,
		rollupOptions: {
			output: {
				// Code splitting for better performance
				manualChunks: {
					'vendor': ['svelte', '@sveltejs/kit'],
					'charts': ['@observablehq/plot', 'd3'],
				}
			}
		}
	},
	
	optimizeDeps: {
		// Pre-bundle dependencies for faster dev startup
		include: ['@observablehq/plot', 'd3']
	},
	
	define: {
		// Environment variables for dashboard config
		__DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
		__API_URL__: JSON.stringify(process.env.API_URL || 'http://localhost:8080'),
		__WS_URL__: JSON.stringify(process.env.WS_URL || 'ws://localhost:8080/ws')
	}
});