-- Vídeos curtidos na aba Ideias & roteiros (cada criador tem a sua lista)
create table if not exists public.curtidos (
  criador_id uuid not null references public.perfis (id) on delete cascade default auth.uid(),
  video_id text not null,
  video jsonb not null,            -- título, canal, capa, views... do momento em que curtiu
  criado_em timestamptz not null default now(),
  primary key (criador_id, video_id)
);
alter table public.curtidos enable row level security;
drop policy if exists "curtidos: dono lê" on public.curtidos;
create policy "curtidos: dono lê" on public.curtidos for select to authenticated using (criador_id = auth.uid());
drop policy if exists "curtidos: dono curte" on public.curtidos;
create policy "curtidos: dono curte" on public.curtidos for insert to authenticated with check (criador_id = auth.uid());
drop policy if exists "curtidos: dono descurte" on public.curtidos;
create policy "curtidos: dono descurte" on public.curtidos for delete to authenticated using (criador_id = auth.uid());
revoke all on public.curtidos from anon;
grant select, insert, delete on public.curtidos to authenticated;
select count(*) as curtidos from public.curtidos;
