-- Gravar juntos: pedidos de ajuda para gravar e quem aceitou ajudar (R$ 25 por gravação confirmada)
create table if not exists public.pedidos_ajuda (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.perfis (id) on delete cascade,
  dia date not null,
  hora time not null,
  duracao_min int not null check (duracao_min between 15 and 240),
  vagas int not null check (vagas between 1 and 10),
  mapa text not null,
  descricao text not null default '',
  status text not null default 'aberto' check (status in ('aberto', 'feito', 'cancelado')),
  confirmado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists pedidos_ajuda_dia on public.pedidos_ajuda (dia);

create table if not exists public.ajudas (
  pedido_id uuid not null references public.pedidos_ajuda (id) on delete cascade,
  ajudante_id uuid not null references public.perfis (id) on delete cascade,
  presente boolean not null default true,   -- quem pediu desmarca quem não apareceu
  criado_em timestamptz not null default now(),
  primary key (pedido_id, ajudante_id)
);
create index if not exists ajudas_ajudante on public.ajudas (ajudante_id);

-- a equipe toda vê a agenda; quem grava é só o servidor (as regras ficam no site)
alter table public.pedidos_ajuda enable row level security;
alter table public.ajudas enable row level security;
drop policy if exists "pedidos_ajuda: equipe lê" on public.pedidos_ajuda;
create policy "pedidos_ajuda: equipe lê" on public.pedidos_ajuda for select to authenticated using (true);
drop policy if exists "ajudas: equipe lê" on public.ajudas;
create policy "ajudas: equipe lê" on public.ajudas for select to authenticated using (true);
revoke all on public.pedidos_ajuda, public.ajudas from anon;
revoke insert, update, delete on public.pedidos_ajuda, public.ajudas from authenticated;
grant select on public.pedidos_ajuda, public.ajudas to authenticated;

-- fechamento do mês guarda o bônus de ajuda
alter table public.pagamentos add column if not exists bonus_ajuda_centavos bigint not null default 0;
