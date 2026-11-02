-- Vídeos extras pagos no Pix (não entram no total do mês): o criador manda o link e a chave Pix
alter table public.extras add column if not exists pix boolean not null default false;
alter table public.entregas_extra add column if not exists chave_pix text not null default '';

-- extras de segunda (02/11/2026): pagos no Pix (pedido do gestor)
update public.extras set pix = true where prazo = '2026-11-02';

-- avisa quem já mandou link nesses extras que falta a chave Pix
insert into public.notificacoes (criador_id, tipo, titulo, texto, link, chave)
select distinct e.criador_id, 'pagamento', 'Mande sua chave Pix 💸', 'Os extras de segunda são pagos no Pix.', '/dias#extras', 'pix:chave:2026-11-02'
from public.entregas_extra e join public.extras x on x.id = e.extra_id
where x.prazo = '2026-11-02' and e.chave_pix = ''
on conflict (criador_id, chave) do nothing;

select (select count(*) from public.extras where pix) as extras_pix;
