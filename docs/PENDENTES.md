# O que está pendente (atualizado em 05/11/2026)

Resumo para quem continuar o projeto (por exemplo, no Claude Code). As regras do projeto estão no `CLAUDE.md`.

## Banco de dados
- Os comandos de banco ficam em `supabase/migrations/` e **não rodam sozinhos**: o gestor cola cada um no SQL Editor da Supabase e clica em Run.
- Rodar a `0024_views_por_dia.sql` (deixa o gráfico do mês da Dashboard mais rápido; sem ela o gráfico funciona, só demora um pouco mais).
- Confirmar se a `0023_pix_pago.sql` (botão "Marcar como pago ✅" dos extras no Pix) já foi rodada. As anteriores (0020 novidades/sugestões, 0021 curtidos, 0022 extras no Pix) já estão no banco.
- Ideia aprovada em conversa, ainda não feita: GitHub Actions que roda as migrações sozinho a cada push (o gestor precisa colar a connection string do banco em Settings → Secrets → Actions).

## Decisões esperando o gestor
- YouTube provisório: usar a YouTube Data API (total de views quase na hora, ganho do dia = diferença) para não ficar zerado nos 2–3 primeiros dias do mês, trocando pelo número oficial da Analytics quando sair. Falta decidir se o dinheiro também usa o número provisório ou só as views.
- "Mais virais do mês" (perfil do criador no painel): hoje mostra views ganhas no mês, inclusive de vídeos antigos. Oferecido: mostrar só vídeos postados no mês, ou os dois quadros.

## Do lado do gestor
- TikTok e Instagram ainda em modo de teste (criadores entram como testadores). Quando o TikTok aprovar o app, trocar as chaves na Vercel.
- Títulos virais e hashtags de referência para a aba SEO.
