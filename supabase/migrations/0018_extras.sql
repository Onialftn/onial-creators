-- Vídeos extras: o gestor sugere um vídeo extra com valor e prazo; qualquer criador faz, manda o link e o gestor aprova
create table if not exists public.extras (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null default '',
  valor_centavos int not null check (valor_centavos between 1 and 10000000),
  prazo date not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create table if not exists public.entregas_extra (
  extra_id uuid not null references public.extras (id) on delete cascade,
  criador_id uuid not null references public.perfis (id) on delete cascade,
  link text not null,
  status text not null default 'enviado' check (status in ('enviado', 'aprovado', 'recusado')),
  motivo text not null default '',
  enviado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  mes text,                 -- mês (AAAA-MM) em que o valor entra no pagamento: o mês da aprovação
  primary key (extra_id, criador_id)
);
create index if not exists entregas_extra_criador on public.entregas_extra (criador_id, mes);
alter table public.extras enable row level security;
alter table public.entregas_extra enable row level security;
drop policy if exists "extras: equipe lê" on public.extras;
create policy "extras: equipe lê" on public.extras for select to authenticated using (true);
drop policy if exists "entregas_extra: dono e gestor leem" on public.entregas_extra;
create policy "entregas_extra: dono e gestor leem" on public.entregas_extra for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
revoke all on public.extras, public.entregas_extra from anon;
revoke insert, update, delete on public.extras, public.entregas_extra from authenticated;
grant select on public.extras, public.entregas_extra to authenticated;

alter table public.pagamentos add column if not exists bonus_extra_centavos bigint not null default 0;
