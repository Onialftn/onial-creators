-- Traduções prontas de cada vídeo de referência (por mapa): quem clicar depois copia na hora, sem gastar IA de novo.
create table if not exists public.traducoes (
  video_id text not null,
  mapa text not null,
  titulo text not null default '',
  falas jsonb not null,
  mapa_citado text not null default '',
  criado_em timestamptz not null default now(),
  primary key (video_id, mapa)
);
alter table public.traducoes enable row level security;
drop policy if exists "traducoes: todos leem" on public.traducoes;
create policy "traducoes: todos leem" on public.traducoes for select to authenticated using (true);
grant select on public.traducoes to authenticated;
