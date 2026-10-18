import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { handle } from '../server/app.js';

// vercel.json rewrites /writing, /dashboard and /api/* here; request.url keeps the original path.
// The built templates ship with the function via `includeFiles`.
const template = (name) => readFile(join(process.cwd(), 'dist/templates', `${name}.html`), 'utf8');
const serve = (request) => handle(request, { env: process.env, template });

export { serve as GET, serve as POST, serve as PUT, serve as DELETE };
