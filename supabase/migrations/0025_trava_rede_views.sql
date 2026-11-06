-- Trava: as views de um dia sempre ficam na MESMA rede (e no mesmo criador) do vídeo.
-- Antes, um lançamento manual com o link de outra rede podia gravar views do Instagram em cima de um vídeo do YouTube.
-- "not valid": vale para tudo o que for gravado daqui para frente; não mexe nem apaga nada do que já está no banco.
alter table public.videos add constraint videos_id_criador_plataforma_key unique (id, criador_id, plataforma);
alter table public.views_diarias
  add constraint views_diarias_mesma_rede_do_video
  foreign key (video_id, criador_id, plataforma) references public.videos (id, criador_id, plataforma)
  on delete cascade not valid;
select count(*) as pronto from information_schema.table_constraints where constraint_name = 'views_diarias_mesma_rede_do_video';
