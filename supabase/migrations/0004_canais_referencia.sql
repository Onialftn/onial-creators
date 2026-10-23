-- Ideias de vídeos: canais de referência por mapa e tema (cadastrados pelo gestor)
create table if not exists public.canais_referencia (
  id uuid primary key default gen_random_uuid(),
  mapa text not null,
  tema text not null,
  canal_id text not null,
  nome text not null,
  foto_url text,
  criado_em timestamptz not null default now(),
  unique (mapa, tema, canal_id)
);
alter table public.canais_referencia enable row level security;
drop policy if exists "canais_referencia: todos leem" on public.canais_referencia;
create policy "canais_referencia: todos leem" on public.canais_referencia for select to authenticated using (true);
drop policy if exists "canais_referencia: gestor edita" on public.canais_referencia;
create policy "canais_referencia: gestor edita" on public.canais_referencia for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
grant select, insert, update, delete on public.canais_referencia to authenticated;
