-- (não usada: a ideia mudou para as 3 opções automáticas pelo mapa do dia)
-- Dias de postagem: até 3 opções de vídeo que o gestor escolhe para o criador em cada dia
create table if not exists public.videos_dia (
  criador_id uuid not null references public.perfis (id) on delete cascade,
  dia date not null,
  ordem smallint not null check (ordem between 1 and 3),
  link text not null,
  recado text not null default '',
  primary key (criador_id, dia, ordem)
);
alter table public.videos_dia enable row level security;
drop policy if exists "videos_dia: dono e gestor leem" on public.videos_dia;
create policy "videos_dia: dono e gestor leem" on public.videos_dia for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
drop policy if exists "videos_dia: gestor edita" on public.videos_dia;
create policy "videos_dia: gestor edita" on public.videos_dia for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
grant select, insert, update, delete on public.videos_dia to authenticated;
