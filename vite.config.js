import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { defineConfig, loadEnv } from 'vite';
import { handle } from './server/app.js';

// In dev, Vite serves the same routes the Vercel function handles in production (see vercel.json).
const SERVER_ROUTE = /^\/(writing|dashboard)(\/|$)|^\/api\//;

function server() {
  return {
    name: 'mutual-progress-server',
    configureServer(vite) {
      const env = loadEnv(vite.config.mode, process.cwd(), '');
      const template = async (name) =>
        vite.transformIndexHtml(`/templates/${name}.html`, await readFile(`templates/${name}.html`, 'utf8'));

      vite.middlewares.use(async (req, res, next) => {
        if (!SERVER_ROUTE.test(req.url.split('?')[0])) return next();
        try {
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const request = new Request(new URL(req.url, `http://${req.headers.host}`), {
            method: req.method,
            headers: req.headers,
            body: hasBody ? Readable.toWeb(req) : undefined,
            duplex: 'half',
          });
          const response = await handle(request, { env, template });
          res.statusCode = response.status;
          for (const [key, value] of response.headers) res.appendHeader(key, value);
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [server()],
  build: {
    rollupOptions: {
      input: {
        home: 'index.html',
        writing: 'templates/writing.html',
        post: 'templates/post.html',
        login: 'templates/login.html',
        dashboard: 'templates/dashboard.html',
        editor: 'templates/editor.html',
      },
    },
  },
});
