-- Conferir as views de um criador (só leitura: não muda nada no banco).
-- Cole no SQL Editor da Supabase, troque NOME pelo nome do criador e clique em Run.

-- 1) Views gravadas em uma rede diferente da do vídeo (deveria dar 0 linhas)
select p.nome, v.dia, v.plataforma as rede_das_views, vi.plataforma as rede_do_video, vi.titulo, v.views
from views_diarias v
join videos vi on vi.id = v.video_id
join perfis p on p.id = v.criador_id
where v.plataforma <> vi.plataforma or v.criador_id <> vi.criador_id
order by v.dia desc;

-- 2) Views de cada dia do mês, por rede, de um criador (a coluna "outros" mostra quanto veio de "Outros vídeos/conteúdos")
select v.dia, v.plataforma,
  sum(v.views) as views,
  sum(case when vi.id_externo like '\_\_outros\_\_%' then v.views else 0 end) as outros
from views_diarias v
join videos vi on vi.id = v.video_id
join perfis p on p.id = v.criador_id
where p.nome ilike '%NOME%' and v.dia >= date_trunc('month', current_date)
group by v.dia, v.plataforma
order by v.dia, v.plataforma;

-- 3) Total do mês por rede do criador
select v.plataforma, sum(v.views) as views_do_mes
from views_diarias v
join perfis p on p.id = v.criador_id
where p.nome ilike '%NOME%' and v.dia >= date_trunc('month', current_date)
group by v.plataforma;
