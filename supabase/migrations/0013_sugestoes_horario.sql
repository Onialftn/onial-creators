-- Gravar juntos: sugestões de outro horário para um pedido de ajuda
create table if not exists public.sugestoes_horario (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos_ajuda (id) on delete cascade,
  criador_id uuid not null references public.perfis (id) on delete cascade,
  dia date not null,
  hora time not null,
  mensagem text not null default '',
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada')),
  criado_em timestamptz not null default now()
);
create index if not exists sugestoes_horario_pedido on public.sugestoes_horario (pedido_id);
alter table public.sugestoes_horario enable row level security;
drop policy if exists "sugestoes_horario: equipe lê" on public.sugestoes_horario;
create policy "sugestoes_horario: equipe lê" on public.sugestoes_horario for select to authenticated using (true);
revoke all on public.sugestoes_horario from anon;
revoke insert, update, delete on public.sugestoes_horario from authenticated;
grant select on public.sugestoes_horario to authenticated;
