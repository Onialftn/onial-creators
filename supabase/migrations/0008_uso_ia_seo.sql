-- Uso da IA: novo tipo "seo" (títulos, descrições e hashtags)
alter table public.uso_ia drop constraint if exists uso_ia_tipo_check;
alter table public.uso_ia add constraint uso_ia_tipo_check check (tipo in ('roteiro', 'ideia', 'avaliacao', 'seo'));
