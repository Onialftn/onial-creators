-- "Limpar" uma notificação só esconde (a chave continua guardada, então o mesmo aviso não volta)
alter table public.notificacoes add column if not exists oculta boolean not null default false;
revoke update on public.notificacoes from authenticated;
grant update (lida, oculta) on public.notificacoes to authenticated;
