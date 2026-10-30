-- Novidades dos mapas (o gestor publica) e sugestões para melhorar o site (criador manda, gestor aprova ou recusa)
create table if not exists public.novidades (
  id uuid primary key default gen_random_uuid(),
  mapa text not null default '',
  titulo text not null,
  texto text not null default '',
  criado_em timestamptz not null default now()
);
create table if not exists public.sugestoes (
  id uuid primary key default gen_random_uuid(),
  criador_id uuid not null references public.perfis (id) on delete cascade,
  texto text not null,
  status text not null default 'enviada' check (status in ('enviada', 'aprovada', 'recusada')),
  motivo text not null default '',
  criado_em timestamptz not null default now(),
  respondido_em timestamptz
);
create index if not exists sugestoes_criador on public.sugestoes (criador_id, criado_em desc);
alter table public.novidades enable row level security;
alter table public.sugestoes enable row level security;
drop policy if exists "novidades: equipe lê" on public.novidades;
create policy "novidades: equipe lê" on public.novidades for select to authenticated using (true);
drop policy if exists "sugestoes: dono e gestor leem" on public.sugestoes;
create policy "sugestoes: dono e gestor leem" on public.sugestoes for select to authenticated using (criador_id = auth.uid() or public.e_gestor());
revoke all on public.novidades, public.sugestoes from anon;
revoke insert, update, delete on public.novidades, public.sugestoes from authenticated;
grant select on public.novidades, public.sugestoes to authenticated;

insert into public.novidades (mapa, titulo, texto)
select '1v1', 'Atualização do mapa de XP! 🎮', $t$Pessoal, nosso mapa recebeu diversas melhorias e novidades! Confira os principais destaques:

**🔥 PRINCIPAIS NOVIDADES**
- 🏝️ Nova ilha de XP!
- 👹 Boss de XP com premiação ao eliminar!
- 💚 Recuperação de vida ao eliminar bots.
- ⚡ Velocidade de corrida aumentada (2x).
- 🏃 Corrimão com velocidade e XP.
- 🔫 Nova área para liberar a SPAS de XP.
- 💎 VIP reduzido para 200.
- 🎨 Grama e visual do mapa atualizados.

**🛠️ MELHORIAS E CORREÇÕES**
- ✅ Novas opções para controlar os bots.
- ✅ Remoção da antiga ilha de XP.
- ✅ Melhorias na cabine de skins e no lobby.
- ✅ Ajustes nos sistemas de XP e na arena do boss.
- ✅ Otimizações gerais no mapa.

📢 **IMPORTANTE:** Essas mudanças fazem parte da nossa nova atualização! Aproveitem as novidades para criar vídeos, explorar os novos métodos de XP e divulgar o mapa! 🚀$t$
where not exists (select 1 from public.novidades);

select (select count(*) from public.novidades) as novidades, (select count(*) from public.sugestoes) as sugestoes;
