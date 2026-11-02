-- Extra no Pix: quando o gestor marca que já fez o Pix
alter table public.entregas_extra add column if not exists pix_pago_em timestamptz;
select count(*) as colunas from information_schema.columns where table_name = 'entregas_extra' and column_name = 'pix_pago_em';
