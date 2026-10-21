-- Onial Creators: coleta automática de views (YouTube, TikTok, Instagram)
-- Cole no SQL Editor da Supabase e clique em Run (depois do 0001).

-- total de views de cada vídeo na última coleta (TikTok e Instagram só informam o total;
-- as views ganhas no dia = total de hoje − total de ontem)
alter table public.videos add column if not exists views_total bigint not null default 0;
alter table public.videos add column if not exists views_total_em timestamptz;

-- estado da coleta de cada conta conectada
alter table public.contas_plataforma add column if not exists ultima_coleta timestamptz;
alter table public.contas_plataforma add column if not exists erro text;
alter table public.contas_plataforma add column if not exists foto_url text;
