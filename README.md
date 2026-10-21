# Onial Creators

Painel da equipe de conteúdo de Fortnite da Onial. Regras, telas e visual estão em `CLAUDE.md` e no protótipo `onial-creators.html`.

## O que já funciona (Fase 1)

- Login por e-mail e senha (criador e gestor)
- Dashboard, Dias de postagem (calendário com reposição na semana), Metas de views, Pagamentos e Ranking (só views)
- Painel do gestor: cadastrar criador, meta individual, 5 dias de postagem, lançar views, registrar postagens, fechar o mês e marcar como pago
- Pomodoro (60/20, arraste da bolinha, configurações, estatísticas) e Áudio (corta silêncios e respirações, baixa o áudio limpo)
- Ideias de vídeos, Roteiros, Avaliar vídeo e Meta coletiva aparecem como "Em breve"

Ainda falta: views do YouTube automáticas (Fase 1, pedido 4) e as fases 2 e 3.

## Colocar no ar

1. **Supabase**: crie um projeto, abra *SQL Editor*, cole o conteúdo de `supabase/migrations/0001_inicial.sql` e clique em *Run*.
2. **Vercel**: *Add New → Project*, importe este repositório e, em *Environment Variables*, crie:
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase → Project Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — mesma tela, chave `anon` `public`
   - `SUPABASE_SERVICE_ROLE_KEY` — mesma tela, chave `service_role` (secreta: só aqui, nunca no código)
3. **Primeiro gestor**: no Supabase, *Authentication → Users → Add user* com seu e-mail e senha. Depois, no *SQL Editor*:
   ```sql
   update public.perfis set papel = 'gestor', nome = 'Seu nome' where id = (select id from auth.users where email = 'seu@email.com');
   ```
4. Entre no site com esse e-mail e cadastre os criadores pelo *Painel do gestor*.

## Para quem programa

```bash
npm install
cp .env.example .env.local   # preencha as três variáveis
npm run dev
npm test                     # testes das regras de pagamento
```
