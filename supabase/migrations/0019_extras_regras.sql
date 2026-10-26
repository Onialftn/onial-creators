-- Vídeos extras: regras escritas pelo gestor
alter table public.extras add column if not exists regras text not null default '';
