-- Run once in the Supabase SQL editor (or `supabase db push`).
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  subtitle text,
  content text not null default '',
  written_by text,
  cover_image_url text,
  preview_token text not null unique,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_published_at on public.posts (published_at desc);

-- No policies: only the server's service-role key can read or write, so drafts never leak through the anon key.
alter table public.posts enable row level security;
