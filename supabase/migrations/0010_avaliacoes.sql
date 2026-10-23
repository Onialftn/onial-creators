-- Avaliar vídeo: resultado de cada avaliação (o vídeo em si é apagado depois de avaliado)
create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.perfis (id) on delete cascade,
  arquivo text not null default '',
  nota int not null,
  resultado jsonb not null,
  criado_em timestamptz not null default now()
);
create index if not exists avaliacoes_criador on public.avaliacoes (criador_id, criado_em desc);
alter table public.avaliacoes enable row level security;
drop policy if exists "avaliacoes: dono e gestor leem" on public.avaliacoes;
create policy "avaliacoes: dono e gestor leem" on public.avaliacoes for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
grant select on public.avaliacoes to authenticated;

-- pasta privada onde o vídeo fica só até a IA terminar (partes de até 45 MB; só o servidor acessa)
insert into storage.buckets (id, name, public, file_size_limit)
values ('avaliacoes', 'avaliacoes', false, 47185920)
on conflict (id) do update set public = false, file_size_limit = 47185920;
