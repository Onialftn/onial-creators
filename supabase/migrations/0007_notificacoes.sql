-- Notificações (sino do site + aviso no celular)
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.perfis (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  texto text not null default '',
  link text,
  chave text not null,            -- evita repetir o mesmo aviso (ex.: postar:2026-10-23)
  lida boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (criador_id, chave)
);
create index if not exists notificacoes_criador on public.notificacoes (criador_id, criado_em desc);
alter table public.notificacoes enable row level security;
drop policy if exists "notificacoes: dono lê" on public.notificacoes;
create policy "notificacoes: dono lê" on public.notificacoes for select to authenticated using (criador_id = auth.uid());
drop policy if exists "notificacoes: dono marca lida" on public.notificacoes;
create policy "notificacoes: dono marca lida" on public.notificacoes for update to authenticated using (criador_id = auth.uid()) with check (criador_id = auth.uid());
grant select, update (lida) on public.notificacoes to authenticated;

-- Mapa que o gestor escolhe para cada criador em cada semana (semana = segunda-feira)
create table if not exists public.mapa_semana (
  criador_id uuid not null references public.perfis (id) on delete cascade,
  semana date not null,
  mapa text not null,
  primary key (criador_id, semana)
);
alter table public.mapa_semana enable row level security;
drop policy if exists "mapa_semana: dono e gestor leem" on public.mapa_semana;
create policy "mapa_semana: dono e gestor leem" on public.mapa_semana for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
drop policy if exists "mapa_semana: gestor edita" on public.mapa_semana;
create policy "mapa_semana: gestor edita" on public.mapa_semana for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
grant select, insert, update, delete on public.mapa_semana to authenticated;

-- Celulares/navegadores inscritos para receber aviso (só o servidor lê e grava)
create table if not exists public.push_inscricoes (
  endpoint text primary key,
  criador_id uuid not null references public.perfis (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);
alter table public.push_inscricoes enable row level security;
revoke all on public.push_inscricoes from anon, authenticated;

-- posição no ranking, anotada junto com o saldo do dia (para o aviso "você subiu")
alter table public.saldos_diarios add column if not exists posicao int;
