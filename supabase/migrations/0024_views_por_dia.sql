-- Gráfico da Dashboard: soma das views de cada dia por criador e plataforma (deixa o gráfico mais rápido).
-- Segue as mesmas regras de acesso de views_diarias (security_invoker).
create or replace view public.views_por_dia with (security_invoker = true) as
select criador_id, dia, plataforma, sum(views)::bigint as views
from public.views_diarias
group by criador_id, dia, plataforma;
grant select on public.views_por_dia to authenticated;
select count(*) as pronto from information_schema.views where table_name = 'views_por_dia';
