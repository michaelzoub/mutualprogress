import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [cloudflare()],
  environments: {
    // Scoped to the client so the Worker build keeps its own entry.
    client: {
      build: {
        rollupOptions: {
          input: {
            home: 'index.html',
            writing: 'writing/index.html',
            post: 'writing/post.html',
            login: 'dashboard/login.html',
            dashboard: 'dashboard/writing/index.html',
            editor: 'dashboard/writing/edit.html',
          },
        },
      },
    },
  },
});
