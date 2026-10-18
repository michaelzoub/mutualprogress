import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4';
import './styles.css';
import './writing.css';
import './dashboard.css';

const view = document.querySelector('[data-view]')?.dataset.view;

if (document.querySelector('.login-card')) {
  document.querySelector('[data-login-error]').hidden = !new URLSearchParams(location.search).has('error');
} else if (view === 'list') {
  list();
} else if (view === 'editor') {
  editor();
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : {},
    body: options.body && JSON.stringify(options.body),
  });
  if (response.status === 401) {
    location.href = '/dashboard/login';
    throw new Error('Signed out');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

// Anyone with this link can read the post, published or not; it stays out of /writing and search.
function shareUrl(post) {
  return `${location.origin}/writing/preview/${post.preview_token}`;
}

async function copyShareLink(post, button) {
  const label = button.textContent;
  await navigator.clipboard.writeText(shareUrl(post));
  button.textContent = 'Copied';
  setTimeout(() => (button.textContent = label), 1500);
}

function formatDate(iso) {
  // UTC, to match the dates the server renders on the public pages.
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

/* List */

async function list() {
  const status = document.querySelector('[data-status]');
  const table = document.querySelector('.dash-table');
  const rows = document.querySelector('[data-rows]');

  let posts;
  try {
    ({ posts } = await request('/api/dashboard/posts'));
  } catch (error) {
    status.textContent = error.message;
    return;
  }

  if (!posts.length) {
    status.replaceChildren('No posts yet. ', el('a', { href: '/dashboard/writing/new', textContent: 'Write the first one.' }));
    return;
  }

  status.hidden = true;
  table.hidden = false;

  rows.replaceChildren(
    ...posts.map((post) => {
      const remove = el('button', { type: 'button', className: 'link-button link-button--danger', textContent: 'Delete' });
      remove.addEventListener('click', async () => {
        if (!confirm(`Delete “${post.title || 'Untitled'}”? This can't be undone.`)) return;
        remove.disabled = true;
        try {
          await request(`/api/dashboard/posts/${post.id}`, { method: 'DELETE' });
          row.remove();
          if (!rows.children.length) location.reload();
        } catch (error) {
          remove.disabled = false;
          alert(error.message);
        }
      });

      const copy = el('button', { type: 'button', className: 'link-button', textContent: 'Copy link' });
      copy.addEventListener('click', () => copyShareLink(post, copy));

      const title = el('a', { href: `/dashboard/writing/${post.id}`, className: 'dash-title' }, [
        post.title || el('em', { textContent: 'Untitled' }),
      ]);

      const row = el('tr', {}, [
        el('td', {}, [title, post.subtitle ? el('p', { className: 'dash-subtitle', textContent: post.subtitle }) : '']),
        el('td', {}, [
          el('span', {
            className: `dash-pill${post.published_at ? ' is-live' : ''}`,
            textContent: post.published_at ? 'Published' : 'Draft',
          }),
        ]),
        el('td', { className: 'dash-date', textContent: formatDate(post.created_at) }),
        el('td', { className: 'dash-actions' }, [
          post.published_at
            ? el('a', { href: `/writing/${post.slug}`, target: '_blank', textContent: 'View' })
            : el('a', { href: shareUrl(post), target: '_blank', textContent: 'Preview' }),
          post.published_at ? '' : copy,
          el('a', { href: `/dashboard/writing/${post.id}`, textContent: 'Edit' }),
          remove,
        ]),
      ]);
      return row;
    }),
  );
}

/* Editor */

async function editor() {
  const [{ Editor }, { StarterKit }, { Placeholder }, { Image }] = await Promise.all([
    import('@tiptap/core'),
    import('@tiptap/starter-kit'),
    import('@tiptap/extension-placeholder'),
    import('@tiptap/extension-image'),
  ]);

  const main = document.querySelector('[data-view="editor"]');
  const fields = Object.fromEntries([...document.querySelectorAll('[data-field]')].map((f) => [f.dataset.field, f]));
  const buttons = Object.fromEntries([...document.querySelectorAll('[data-action]')].map((b) => [b.dataset.action, b]));
  const links = Object.fromEntries([...document.querySelectorAll('[data-link]')].map((a) => [a.dataset.link, a]));
  const saveStatus = document.querySelector('[data-save-status]');
  const stateLabel = document.querySelector('[data-state]');
  const words = document.querySelector('[data-words]');
  const errorBox = document.querySelector('[data-error]');
  const copyShare = document.querySelector('[data-copy-share]');

  const pathId = location.pathname.split('/').pop();
  let post = null;

  if (pathId !== 'new') {
    try {
      ({ post } = await request(`/api/dashboard/posts/${pathId}`));
    } catch (error) {
      document.body.append(el('p', { className: 'dash-main dash-status', textContent: error.message }));
      return;
    }
  }

  fields.title.value = post?.title ?? '';
  fields.subtitle.value = post?.subtitle ?? '';
  fields.slug.value = post?.slug ?? '';
  fields.writtenBy.value = post?.written_by ?? '';
  fields.coverImageUrl.value = post?.cover_image_url ?? '';

  // The slug follows the title until it's edited by hand or the post has been saved once.
  let slugLocked = Boolean(post);
  let dirty = false;
  let busy = false;

  const tiptap = new Editor({
    element: document.querySelector('[data-editor]'),
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Image,
    ],
    content: post?.content ?? '',
    onUpdate() {
      markDirty();
      countWords();
    },
    onTransaction: syncToolbar,
  });

  function slugify(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-')
      .slice(0, 80);
  }

  function grow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function markDirty() {
    dirty = true;
    saveStatus.textContent = 'Unsaved changes';
  }

  function countWords() {
    const count = tiptap.getText().trim().split(/\s+/).filter(Boolean).length;
    words.textContent = `${count.toLocaleString()} ${count === 1 ? 'word' : 'words'} · ${Math.max(1, Math.round(count / 230))} min read`;
  }

  function render() {
    const live = Boolean(post?.published_at);
    stateLabel.textContent = !post ? 'New post' : live ? `Published ${formatDate(post.published_at)}` : 'Draft';
    stateLabel.classList.toggle('is-live', live);
    buttons.save.hidden = live;
    buttons.publish.textContent = live ? 'Update' : 'Publish';
    buttons.unpublish.hidden = !live;
    buttons.delete.hidden = !post;
    links.preview.hidden = !post;
    copyShare.hidden = !post;
    links.live.hidden = !live;
    if (post) {
      links.preview.href = shareUrl(post);
      links.live.href = `/writing/${post.slug}`;
    }
    document.title = `${fields.title.value.trim() || 'Untitled'} — Dashboard`;
  }

  async function save(publish) {
    if (busy) return;
    busy = true;
    errorBox.hidden = true;
    Object.values(buttons).forEach((b) => (b.disabled = true));
    saveStatus.textContent = publish ? 'Publishing…' : 'Saving…';

    try {
      const body = {
        title: fields.title.value,
        subtitle: fields.subtitle.value,
        slug: fields.slug.value,
        writtenBy: fields.writtenBy.value,
        coverImageUrl: fields.coverImageUrl.value,
        content: tiptap.isEmpty ? '' : tiptap.getHTML(),
        publish,
      };
      ({ post } = post
        ? await request(`/api/dashboard/posts/${post.id}`, { method: 'PUT', body })
        : await request('/api/dashboard/posts', { method: 'POST', body }));

      history.replaceState(null, '', `/dashboard/writing/${post.id}`);
      fields.slug.value = post.slug;
      slugLocked = true;
      dirty = false;
      saveStatus.textContent = publish ? 'Published' : 'Saved';
      render();
    } catch (error) {
      saveStatus.textContent = '';
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    } finally {
      busy = false;
      Object.values(buttons).forEach((b) => (b.disabled = false));
    }
  }

  /* Toolbar */

  const commands = {
    bold: [(c) => c.toggleBold(), 'bold'],
    italic: [(c) => c.toggleItalic(), 'italic'],
    strike: [(c) => c.toggleStrike(), 'strike'],
    h2: [(c) => c.toggleHeading({ level: 2 }), 'heading', { level: 2 }],
    h3: [(c) => c.toggleHeading({ level: 3 }), 'heading', { level: 3 }],
    quote: [(c) => c.toggleBlockquote(), 'blockquote'],
    bullets: [(c) => c.toggleBulletList(), 'bulletList'],
    numbers: [(c) => c.toggleOrderedList(), 'orderedList'],
    code: [(c) => c.toggleCodeBlock(), 'codeBlock'],
    rule: [(c) => c.setHorizontalRule()],
    link: [
      (c) => {
        const current = tiptap.getAttributes('link').href ?? '';
        const href = prompt('Link URL (leave empty to remove)', current);
        if (href === null) return c;
        return href.trim()
          ? c.extendMarkRange('link').setLink({ href: href.trim() })
          : c.extendMarkRange('link').unsetLink();
      },
      'link',
    ],
    image: [
      (c) => {
        const src = prompt('Image URL');
        if (!src?.trim()) return c;
        const alt = prompt('Describe the image (alt text)') ?? '';
        // Follow the image with a paragraph so typing continues below it instead of replacing the selected image.
        return c.insertContent([{ type: 'image', attrs: { src: src.trim(), alt } }, { type: 'paragraph' }]);
      },
    ],
  };

  const toolButtons = [...document.querySelectorAll('[data-cmd]')];

  toolButtons.forEach((button) => {
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => commands[button.dataset.cmd][0](tiptap.chain().focus()).run());
  });

  function syncToolbar() {
    toolButtons.forEach((button) => {
      const [, mark, attrs] = commands[button.dataset.cmd];
      if (mark) button.setAttribute('aria-pressed', String(tiptap.isActive(mark, attrs)));
    });
  }

  /* Fields and shortcuts */

  [fields.title, fields.subtitle].forEach((textarea) => {
    textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (textarea === fields.title) return fields.subtitle.focus();
      // tiptap's focus command waits a frame, which lets fast typing land in the subtitle, so focus the view directly.
      tiptap.commands.setTextSelection(1);
      tiptap.view.focus();
    });
    textarea.addEventListener('input', () => grow(textarea));
  });

  fields.title.addEventListener('input', () => {
    if (!slugLocked) fields.slug.value = slugify(fields.title.value);
    render();
  });
  fields.slug.addEventListener('input', () => (slugLocked = true));
  Object.values(fields).forEach((field) => field.addEventListener('input', markDirty));

  copyShare.addEventListener('click', () => copyShareLink(post, copyShare));
  buttons.save.addEventListener('click', () => save(false));
  buttons.publish.addEventListener('click', () => save(true));
  buttons.unpublish.addEventListener('click', () => {
    if (confirm('Unpublish this post? It will come off /writing but stay here as a draft.')) save(false);
  });
  buttons.delete.addEventListener('click', async () => {
    if (!confirm(`Delete “${post.title || 'Untitled'}”? This can't be undone.`)) return;
    try {
      await request(`/api/dashboard/posts/${post.id}`, { method: 'DELETE' });
      dirty = false;
      location.href = '/dashboard/writing';
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      event.preventDefault();
      save(Boolean(post?.published_at));
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (dirty) event.preventDefault();
  });

  main.hidden = false;
  [fields.title, fields.subtitle].forEach(grow);
  countWords();
  syncToolbar();
  render();
  saveStatus.textContent = '';
  if (!post) fields.title.focus();
}
