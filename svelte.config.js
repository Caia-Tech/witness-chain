import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter({
			// Production server configuration
			out: 'build',
			precompress: true,
			env: {
				host: 'HOST',
				port: 'PORT'
			}
		}),
		
		// Enable client-side hydration for better performance
		serviceWorker: {
			register: false // Disable for now, enable for PWA features
		},

		// Allow large payloads for real-time data
		files: {
			assets: 'static',
			hooks: {
				client: 'src/hooks.client.ts',
				server: 'src/hooks.server.ts'
			},
			lib: 'src/lib',
			params: 'src/params',
			routes: 'src/routes',
			serviceWorker: 'src/service-worker.ts',
			appTemplate: 'src/app.html'
		}
	}
};

export default config;