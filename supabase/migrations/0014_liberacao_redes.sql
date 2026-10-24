-- Liberação de Instagram e TikTok enquanto os apps estão em modo de teste: o criador informa o @ e o gestor libera
create table if not exists public.liberacoes (
  criador_id uuid not null references public.perfis (id) on delete cascade,
  rede text not null check (rede in ('instagram', 'tiktok')),
  usuario text not null,
  liberado boolean not null default false,
  pedido_em timestamptz not null default now(),
  liberado_em timestamptz,
  primary key (criador_id, rede)
);
alter table public.liberacoes enable row level security;
drop policy if exists "liberacoes: dono e gestor leem" on public.liberacoes;
create policy "liberacoes: dono e gestor leem" on public.liberacoes for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
revoke all on public.liberacoes from anon;
revoke insert, update, delete on public.liberacoes from authenticated;
grant select on public.liberacoes to authenticated;
