-- Onial Creators: banco de dados da Fase 1
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.

-- ---------- perfis ----------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  papel text not null default 'criador' check (papel in ('criador', 'gestor')),
  foto_url text,
  canal_youtube text,
  criado_em timestamptz not null default now()
);

-- quem é gestor (usada nas regras de acesso)
create or replace function public.e_gestor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and papel = 'gestor');
$$;

-- cria o perfil automaticamente quando o gestor cadastra alguém
create or replace function public.novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome) values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.novo_usuario();

-- usuários criados antes deste arquivo também ganham perfil
insert into public.perfis (id, nome)
select id, coalesce(raw_user_meta_data ->> 'nome', split_part(email, '@', 1)) from auth.users
on conflict (id) do nothing;

-- um criador não pode se promover a gestor pelo site
create or replace function public.proteger_papel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- pelo SQL Editor (sem usuário logado) é permitido: é assim que o primeiro gestor é definido
  if new.papel is distinct from old.papel and auth.uid() is not null and not public.e_gestor() then
    raise exception 'Só o gestor pode mudar o papel de alguém';
  end if;
  return new;
end $$;
create trigger proteger_papel before update on public.perfis for each row execute function public.proteger_papel();

-- ---------- contas das plataformas ----------
create table public.contas_plataforma (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.perfis (id) on delete cascade,
  plataforma text not null check (plataforma in ('youtube', 'tiktok', 'instagram')),
  conta_externa_id text,
  nome_conta text,
  conectado_em timestamptz not null default now(),
  unique (criador_id, plataforma)
);

-- tokens de acesso das plataformas: só o servidor lê (nenhuma regra de acesso = ninguém pelo navegador)
create table public.tokens_plataforma (
  conta_id uuid primary key references public.contas_plataforma (id) on delete cascade,
  access_token text,
  refresh_token text,
  expira_em timestamptz
);

-- ---------- vídeos e views ----------
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.perfis (id) on delete cascade,
  plataforma text not null check (plataforma in ('youtube', 'tiktok', 'instagram')),
  id_externo text,
  titulo text not null default '',
  url text,
  postado_em date not null,
  criado_em timestamptz not null default now(),
  unique (plataforma, id_externo)
);
create index on public.videos (criador_id, postado_em);

-- views GANHAS em cada dia (não o total acumulado)
create table public.views_diarias (
  video_id uuid not null references public.videos (id) on delete cascade,
  dia date not null,
  criador_id uuid not null references public.perfis (id) on delete cascade,
  plataforma text not null check (plataforma in ('youtube', 'tiktok', 'instagram')),
  views bigint not null default 0 check (views >= 0),
  primary key (video_id, dia)
);
create index on public.views_diarias (criador_id, dia);

-- ---------- postagens ----------
-- os 5 dias de postagem de cada criador (1 = segunda ... 7 = domingo)
create table public.agenda_postagem (
  criador_id uuid not null references public.perfis (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 1 and 7),
  primary key (criador_id, dia_semana)
);

-- registro de cada dia: quantos vídeos postou (o gestor confere e ajusta)
create table public.dias_postagem (
  criador_id uuid not null references public.perfis (id) on delete cascade,
  dia date not null,
  postagens smallint not null default 0 check (postagens >= 0),
  observacao text,
  primary key (criador_id, dia)
);

-- ---------- metas e pagamentos ----------
create table public.metas (
  criador_id uuid not null references public.perfis (id) on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  meta_views bigint not null check (meta_views > 0),
  primary key (criador_id, mes)
);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.perfis (id) on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  views bigint not null,
  faltas smallint not null,
  bruto_centavos bigint not null,
  constancia_centavos bigint not null,
  bonus_meta_centavos bigint not null,
  total_centavos bigint not null,
  status text not null default 'em_aberto' check (status in ('em_aberto', 'pago')),
  pago_em timestamptz,
  unique (criador_id, mes)
);

-- ---------- ranking: só nome, foto e views ----------
create view public.ranking_mensal with (security_invoker = true) as
select p.id as criador_id, p.nome, p.foto_url, to_char(v.dia, 'YYYY-MM') as mes, v.plataforma, sum(v.views)::bigint as views
from public.views_diarias v join public.perfis p on p.id = v.criador_id
group by p.id, p.nome, p.foto_url, to_char(v.dia, 'YYYY-MM'), v.plataforma;

-- ---------- regras de acesso (Row Level Security) ----------
alter table public.perfis enable row level security;
alter table public.contas_plataforma enable row level security;
alter table public.tokens_plataforma enable row level security;
alter table public.videos enable row level security;
alter table public.views_diarias enable row level security;
alter table public.agenda_postagem enable row level security;
alter table public.dias_postagem enable row level security;
alter table public.metas enable row level security;
alter table public.pagamentos enable row level security;

-- perfis: todos logados veem nome e foto (ranking); cada um edita o seu; gestor edita todos
create policy "perfis: ler" on public.perfis for select to authenticated using (true);
create policy "perfis: editar o próprio" on public.perfis for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "perfis: gestor edita" on public.perfis for all to authenticated using (public.e_gestor()) with check (public.e_gestor());

-- vídeos e views: todos logados leem (o ranking é só de views); só o gestor escreve
create policy "videos: ler" on public.videos for select to authenticated using (true);
create policy "videos: gestor escreve" on public.videos for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
create policy "views: ler" on public.views_diarias for select to authenticated using (true);
create policy "views: gestor escreve" on public.views_diarias for all to authenticated using (public.e_gestor()) with check (public.e_gestor());

-- dados pessoais e dinheiro: só o próprio criador lê; só o gestor escreve
create policy "contas: ler as próprias" on public.contas_plataforma for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
create policy "contas: gestor escreve" on public.contas_plataforma for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
create policy "agenda: ler a própria" on public.agenda_postagem for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
create policy "agenda: gestor escreve" on public.agenda_postagem for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
create policy "dias: ler os próprios" on public.dias_postagem for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
create policy "dias: gestor escreve" on public.dias_postagem for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
create policy "metas: ler as próprias" on public.metas for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
create policy "metas: gestor escreve" on public.metas for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
create policy "pagamentos: ler os próprios" on public.pagamentos for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
create policy "pagamentos: gestor escreve" on public.pagamentos for all to authenticated using (public.e_gestor()) with check (public.e_gestor());
-- tokens_plataforma: sem regras = bloqueado para todos no navegador (só o servidor acessa)

-- ---------- permissões da API ----------
-- Garante o acesso pela API mesmo se o projeto foi criado com "expor tabelas automaticamente" desligado.
-- Quem pode ver o quê continua decidido pelas regras de acesso (RLS) acima.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.perfis, public.contas_plataforma, public.videos, public.views_diarias,
  public.agenda_postagem, public.dias_postagem, public.metas, public.pagamentos to authenticated;
grant select on public.ranking_mensal to authenticated;
revoke all on public.tokens_plataforma from anon, authenticated;
