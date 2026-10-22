-- Fase 2: roteiros com IA e controle de uso da IA por criador

-- roteiros salvos pelo criador
create table if not exists public.roteiros (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.perfis (id) on delete cascade,
  titulo text not null,
  mapa text not null,
  tema text not null,
  duracao int not null,
  original text not null,
  resultado jsonb not null,
  criado_em timestamptz not null default now()
);
create index if not exists roteiros_criador on public.roteiros (criador_id, criado_em desc);

-- cada pedido feito à IA (para limite mensal e para o gestor ver o gasto)
create table if not exists public.uso_ia (
  id bigint generated always as identity primary key,
  criador_id uuid not null references public.perfis (id) on delete cascade,
  tipo text not null check (tipo in ('roteiro', 'ideia', 'avaliacao')),
  tokens_entrada int not null default 0,
  tokens_saida int not null default 0,
  custo_usd numeric(10, 5) not null default 0,
  criado_em timestamptz not null default now()
);
create index if not exists uso_ia_criador on public.uso_ia (criador_id, criado_em);

alter table public.roteiros enable row level security;
alter table public.uso_ia enable row level security;

-- roteiros: cada criador vê, cria e apaga só os seus; o gestor vê todos
drop policy if exists "roteiros: dono lê" on public.roteiros;
create policy "roteiros: dono lê" on public.roteiros for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
drop policy if exists "roteiros: dono cria" on public.roteiros;
create policy "roteiros: dono cria" on public.roteiros for insert to authenticated with check (criador_id = auth.uid());
drop policy if exists "roteiros: dono apaga" on public.roteiros;
create policy "roteiros: dono apaga" on public.roteiros for delete to authenticated using (criador_id = auth.uid());

-- uso da IA: o criador vê o próprio, o gestor vê todos; só o servidor grava
drop policy if exists "uso_ia: dono e gestor leem" on public.uso_ia;
create policy "uso_ia: dono e gestor leem" on public.uso_ia for select to authenticated using (criador_id = auth.uid() or public.e_gestor());

grant select, insert, delete on public.roteiros to authenticated;
grant select on public.uso_ia to authenticated;
