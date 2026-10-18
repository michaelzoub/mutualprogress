import { timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'mp_session';
const SESSION_DAYS = 30;
const LIST_COLUMNS = 'id,slug,title,subtitle,preview_token,published_at,created_at,updated_at';

/*
 * Handles /writing, /dashboard and /api. Static files are served by Vercel (or Vite in dev);
 * `template(name)` returns the built HTML for templates/<name>.html.
 */
export async function handle(request, { env, template }) {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

  try {
    if (path.startsWith('/api/')) return await api(request, env, path);
    if (path === '/writing' || path.startsWith('/writing/')) return await writing(env, template, path);
    if (path === '/dashboard' || path.startsWith('/dashboard/')) return await dashboard(request, env, template, path);
  } catch (error) {
    console.error(error);
    const message = error.notConfigured
      ? 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (or in the Vercel project settings).'
      : error.missingTable
        ? 'The posts table is missing. Run supabase/schema.sql in the Supabase SQL editor.'
        : 'Something went wrong.';
    return path.startsWith('/api/') ? json({ error: message }, 500) : new Response(message, { status: 500 });
  }

  return new Response('Not found', { status: 404 });
}

/* Public writing pages, rendered into the static templates so posts ship in the HTML. */

async function writing(env, template, path) {
  if (path === '/writing') {
    const posts = await db(env, 'posts?select=*&published_at=not.is.null&order=published_at.desc');
    return page(fillSlot(await template('writing'), 'posts', renderPostList(posts)));
  }

  const preview = path.match(/^\/writing\/preview\/([a-f0-9]{48})$/);
  const filter = preview
    ? `preview_token=eq.${preview[1]}`
    : `slug=eq.${encodeURIComponent(path.slice('/writing/'.length))}&published_at=not.is.null`;
  const [post] = await db(env, `posts?select=*&${filter}&limit=1`);

  let body = await template('post');

  if (!post) {
    body = setTitle(body, 'Not found — Mutual Progress');
    return page(fillSlot(body, 'article', renderMissing()), { status: 404 });
  }

  const description = post.subtitle || `${post.title}, from Mutual Progress.`;
  body = setTitle(body, `${post.title || 'Untitled'} — Mutual Progress`);
  body = body.replace(/(<meta name="description" content=")[^"]*/, (_, open) => open + esc(description));
  body = fillSlot(body, 'article', renderArticle(post, preview ? 'Unlisted preview' : null));
  if (!preview) return page(body);
  body = body.replace('</head>', '<meta name="robots" content="noindex" />\n  </head>');
  return page(body, { headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
}

function renderPostList(posts) {
  if (!posts.length) return '<li class="post-empty">Nothing published yet.</li>';

  return posts
    .map(
      (post) => `
        <li class="post">
          <a class="post-link" href="/writing/${encodeURIComponent(post.slug)}">
            <time class="post-date" datetime="${esc(post.published_at)}">${formatDate(post.published_at)}</time>
            <div class="post-text">
              <h2>${esc(post.title || 'Untitled')}</h2>
              ${post.subtitle ? `<p>${esc(post.subtitle)}</p>` : ''}
            </div>
            ${post.cover_image_url ? `<img class="post-cover" src="${esc(post.cover_image_url)}" alt="" loading="lazy" />` : ''}
            <span class="card-arrow" aria-hidden="true"></span>
          </a>
        </li>`,
    )
    .join('');
}

function renderArticle(post, eyebrow) {
  const date = post.published_at
    ? `<time datetime="${esc(post.published_at)}">${formatDate(post.published_at)}</time>`
    : 'Draft';

  return `
    <header class="article-head">
      <p class="article-eyebrow">${eyebrow ? esc(eyebrow) : date}</p>
      <h1>${esc(post.title || 'Untitled')}</h1>
      ${post.subtitle ? `<p class="article-subtitle">${esc(post.subtitle)}</p>` : ''}
    </header>
    ${post.cover_image_url ? `<figure class="article-cover"><img src="${esc(post.cover_image_url)}" alt="" /></figure>` : ''}
    <div class="article-body">${post.content}</div>
    ${post.written_by ? `<p class="article-byline">Written by <span>${esc(post.written_by)}</span></p>` : ''}
    <p class="article-back"><a href="/writing">← All writing</a></p>`;
}

function renderMissing() {
  return `
    <header class="article-head">
      <p class="article-eyebrow">404</p>
      <h1>This piece isn't here.</h1>
      <p class="article-subtitle">It may have been unpublished or moved.</p>
    </header>
    <p class="article-back"><a href="/writing">← All writing</a></p>`;
}

/* Dashboard pages: static shells behind the session cookie. */

async function dashboard(request, env, template, path) {
  const authed = await hasSession(request, env);
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

  if (path === '/dashboard/login') {
    if (authed) return redirect('/dashboard/writing');
    return page(await template('login'), { headers });
  }
  if (!authed) return redirect('/dashboard/login');
  if (path === '/dashboard') return redirect('/dashboard/writing');
  if (path === '/dashboard/writing') return page(await template('dashboard'), { headers });
  if (/^\/dashboard\/writing\/(new|[0-9a-f-]{36})$/.test(path)) {
    return page(await template('editor'), { headers });
  }
  return new Response('Not found', { status: 404, headers });
}

/* API */

async function api(request, env, path) {
  try {
    return await routeApi(request, env, path);
  } catch (error) {
    if (error.slugConflict) return json({ error: 'Another post already uses that slug.' }, 409);
    throw error;
  }
}

async function routeApi(request, env, path) {
  const { method } = request;

  if (path === '/api/dashboard/login' && method === 'POST') {
    const form = await request.formData();
    if (!(await passwordMatches(env, String(form.get('password') ?? '')))) {
      return redirect('/dashboard/login?error=1');
    }
    const expires = Date.now() + SESSION_DAYS * 864e5;
    return redirect('/dashboard/writing', {
      'Set-Cookie': cookie(request, `${expires}.${await sign(env, String(expires))}`, SESSION_DAYS * 86400),
    });
  }

  if (path === '/api/dashboard/logout' && method === 'POST') {
    return redirect('/dashboard/login', { 'Set-Cookie': cookie(request, '', 0) });
  }

  if (!path.startsWith('/api/dashboard/posts')) return json({ error: 'Not found' }, 404);
  if (!(await hasSession(request, env))) return json({ error: 'Not signed in' }, 401);
  // Cross-site forms can't send JSON without a preflight, which closes the CSRF gap SameSite leaves open.
  if (method !== 'GET' && method !== 'DELETE' && !request.headers.get('Content-Type')?.includes('application/json')) {
    return json({ error: 'Expected JSON' }, 415);
  }

  const id = path.match(/^\/api\/dashboard\/posts\/([0-9a-f-]{36})$/)?.[1];

  if (path === '/api/dashboard/posts' && method === 'GET') {
    return json({ posts: await db(env, `posts?select=${LIST_COLUMNS}&order=created_at.desc`) });
  }

  if (path === '/api/dashboard/posts' && method === 'POST') {
    const input = postInput(await request.json());
    const [post] = await db(env, 'posts', {
      method: 'POST',
      body: {
        ...input.fields,
        preview_token: randomHex(24),
        published_at: input.publish ? new Date().toISOString() : null,
      },
    });
    return json({ post }, 201);
  }

  if (!id) return json({ error: 'Not found' }, 404);
  const [existing] = await db(env, `posts?select=*&id=eq.${id}`);
  if (!existing) return json({ error: 'Not found' }, 404);

  if (method === 'GET') return json({ post: existing });

  if (method === 'PUT') {
    const input = postInput(await request.json());
    // Republishing keeps the original date; drafting clears it so the post leaves /writing.
    const [post] = await db(env, `posts?id=eq.${id}`, {
      method: 'PATCH',
      body: {
        ...input.fields,
        published_at: input.publish ? (existing.published_at ?? new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      },
    });
    return json({ post });
  }

  if (method === 'DELETE') {
    await db(env, `posts?id=eq.${id}`, { method: 'DELETE' });
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

function postInput(body) {
  const str = (value) => (typeof value === 'string' ? value.trim() : '');
  const title = str(body.title);
  const cover = str(body.coverImageUrl);

  return {
    publish: body.publish === true,
    fields: {
      title,
      subtitle: str(body.subtitle) || null,
      content: typeof body.content === 'string' ? body.content : '',
      slug: slugify(str(body.slug) || title) || `untitled-${randomHex(3)}`,
      written_by: str(body.writtenBy) || null,
      cover_image_url: /^(https?:\/\/|\/)/.test(cover) ? cover : null,
    },
  };
}

/* Sessions: the cookie is an expiry signed with the dashboard password, so changing the password signs everyone out. */

async function hasSession(request, env) {
  const value = request.headers.get('Cookie')?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (!value || !env.DASHBOARD_PASSWORD) return false;
  const [expires, signature] = value.split('.');
  if (!(Number(expires) > Date.now())) return false;
  return safeEqual(signature ?? '', await sign(env, expires));
}

async function passwordMatches(env, password) {
  if (!env.DASHBOARD_PASSWORD) return false;
  // Comparing digests keeps the check constant-time regardless of input length.
  return safeEqual(await sign(env, password), await sign(env, env.DASHBOARD_PASSWORD));
}

async function sign(env, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.DASHBOARD_PASSWORD),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.byteLength === y.byteLength && timingSafeEqual(x, y);
}

function cookie(request, value, maxAge) {
  // Safari drops Secure cookies on http://localhost, so only mark it Secure over HTTPS.
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
}

/* Supabase, over PostgREST with the service-role key. The key never leaves the server. */

async function db(env, query, { method = 'GET', body } = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_URL.includes('your-project')) {
    throw Object.assign(new Error('Supabase is not configured.'), { notConfigured: true });
  }
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${query}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body && JSON.stringify(body),
  });
  if (response.ok) return response.status === 204 ? [] : response.json();

  const detail = await response.json().catch(() => ({}));
  const error = new Error(`Supabase ${response.status}: ${detail.message ?? response.statusText}`);
  error.slugConflict = detail.code === '23505';
  error.missingTable = detail.code === '42P01' || detail.code === 'PGRST205';
  throw error;
}

/* Helpers */

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function randomHex(bytes) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Templates mark their slots with an empty element: <ul data-slot="posts"></ul>.
function fillSlot(html, name, content) {
  return html.replace(new RegExp(`(<[^>]*data-slot="${name}"[^>]*>)(</)`), (_, open, close) => open + content + close);
}

function setTitle(html, title) {
  return html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`);
}

function page(html, { status = 200, headers = {} } = {}) {
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers } });
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function redirect(location, headers = {}) {
  return new Response(null, { status: 303, headers: { Location: location, ...headers } });
}

