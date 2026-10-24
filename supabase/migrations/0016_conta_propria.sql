-- Conta própria da Onial: não recebe pagamento (fica fora dos totais a pagar); o gasto com ferramentas continua contando
alter table public.perfis add column if not exists recebe boolean not null default true;
update public.perfis set recebe = false where id = 'd152ce5c-7e3b-4dab-a623-98e10035f8f2';
