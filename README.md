# Onial Creators

Painel da equipe de conteúdo de Fortnite da Onial. Regras, telas e visual estão em `CLAUDE.md` e no protótipo `onial-creators.html`.

## O que já funciona (Fase 1)

- Login por e-mail e senha (criador e gestor)
- Dashboard, Dias de postagem (calendário com reposição na semana), Metas de views, Pagamentos e Ranking (só views)
- Painel do gestor: cadastrar criador, meta individual, 5 dias de postagem, lançar views, registrar postagens, fechar o mês e marcar como pago
- Pomodoro (60/20, arraste da bolinha, configurações, estatísticas) e Áudio (corta silêncios e respirações, baixa o áudio limpo)
- Ideias de vídeos, Roteiros, Avaliar vídeo e Meta coletiva aparecem como "Em breve"

- Coleta automática de views (aba **Minhas redes**): cada criador conecta YouTube, TikTok e Instagram; todo dia às 6h (Brasília) a Vercel roda `/api/coletar`.

Ainda falta: as fases 2 e 3.

## Coleta automática: variáveis extras na Vercel

Rode antes `supabase/migrations/0002_coleta_automatica.sql` no SQL Editor.

| Variável | De onde vem |
| --- | --- |
| `CRON_SECRET` | Qualquer texto longo e aleatório (a Vercel usa para chamar a coleta diária) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud → APIs e serviços → Credenciais → ID do cliente OAuth (aplicativo da Web). Ative YouTube Data API v3 e YouTube Analytics API. URI de redirecionamento: `https://SEU-SITE/api/conectar/youtube/callback` |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok for Developers → app com Login Kit e escopos `user.info.basic` e `video.list`. Redirect: `https://SEU-SITE/api/conectar/tiktok/callback` |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | Meta for Developers → app com "Instagram API with Instagram Login", escopos `instagram_business_basic` e `instagram_business_manage_insights`. Redirect: `https://SEU-SITE/api/conectar/instagram/callback`. Adicione cada criador como testador do Instagram |

Uma rede sem variáveis aparece como "Em configuração" para os criadores.

## IA (Fase 2): Roteiros

Rode `supabase/migrations/0003_ia_roteiros.sql` no SQL Editor e crie na Vercel:

| Variável | De onde vem |
| --- | --- |
| `GEMINI_API_KEY` | aistudio.google.com/apikey (transcreve os Shorts de referência pelo link; sem ela o criador cola a transcrição) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (defina também um limite de gasto mensal em Limits) |

Limites por criador por mês ficam em `src/lib/ia/uso.ts` (`LIMITE_MES`). O gestor vê o uso e o gasto no Painel do gestor.

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
