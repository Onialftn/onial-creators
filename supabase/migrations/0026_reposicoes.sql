-- Reposição de falta com data marcada (pedido do gestor em 11/11/2026).
-- O criador escolhe o dia em que vai postar o vídeo a mais para repor uma falta:
-- depois da falta, até 7 dias depois e sem passar do fim do mês. Uma data por falta; depois de marcada não muda.
-- Só cria a tabela: não mexe nem apaga nada do que já está no banco.
create table if not exists public.reposicoes (
  criador_id uuid not null references public.perfis (id) on delete cascade,
  falta date not null,
  dia date not null,
  criado_em timestamptz not null default now(),
  primary key (criador_id, falta),
  constraint reposicoes_dentro_do_prazo check (
    dia > falta
    and dia <= falta + 7
    and date_trunc('month', dia) = date_trunc('month', falta)
  )
);
alter table public.reposicoes enable row level security;
drop policy if exists "reposicoes: dono e gestor leem" on public.reposicoes;
create policy "reposicoes: dono e gestor leem" on public.reposicoes for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
drop policy if exists "reposicoes: criador marca a própria" on public.reposicoes;
create policy "reposicoes: criador marca a própria" on public.reposicoes for insert to authenticated with check (criador_id = auth.uid() or public.e_gestor());
drop policy if exists "reposicoes: gestor corrige" on public.reposicoes;
create policy "reposicoes: gestor corrige" on public.reposicoes for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
grant select, insert, update, delete on public.reposicoes to authenticated;
select count(*) as pronto from information_schema.tables where table_schema = 'public' and table_name = 'reposicoes';
