-- Mapa de cada dia da semana por criador (vale toda semana até o gestor trocar). 1 = segunda ... 7 = domingo
create table if not exists public.mapa_dia (
  criador_id uuid not null references public.perfis (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7),
  mapa text not null,
  primary key (criador_id, dia_semana)
);
alter table public.mapa_dia enable row level security;
drop policy if exists "mapa_dia: dono e gestor leem" on public.mapa_dia;
create policy "mapa_dia: dono e gestor leem" on public.mapa_dia for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
drop policy if exists "mapa_dia: gestor edita" on public.mapa_dia;
create policy "mapa_dia: gestor edita" on public.mapa_dia for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
grant select, insert, update, delete on public.mapa_dia to authenticated;

-- começa com o mapa que já estava escolhido para a semana, em todos os dias
insert into public.mapa_dia (criador_id, dia_semana, mapa)
select u.criador_id, d, u.mapa
from (select distinct on (criador_id) criador_id, mapa from public.mapa_semana order by criador_id, semana desc) u
cross join generate_series(1, 7) d
where u.mapa <> ''
on conflict do nothing;
