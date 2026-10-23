-- Total de views do mês de cada criador, anotado depois de cada coleta (uma linha por dia, a última do dia vale).
-- Serve para o "Desde ontem": total de agora − total anotado no dia anterior.
create table if not exists public.saldos_diarios (
  criador_id uuid not null references public.perfis (id) on delete cascade,
  dia date not null,
  mes text not null,
  views_mes bigint not null,
  atualizado_em timestamptz not null default now(),
  primary key (criador_id, dia)
);
alter table public.saldos_diarios enable row level security;
drop policy if exists "saldos_diarios: dono e gestor leem" on public.saldos_diarios;
create policy "saldos_diarios: dono e gestor leem" on public.saldos_diarios for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
grant select on public.saldos_diarios to authenticated;
