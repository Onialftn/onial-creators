-- Gravações: link do vídeo de referência do pedido (opcional)
alter table public.pedidos_ajuda add column if not exists referencia text not null default '';
