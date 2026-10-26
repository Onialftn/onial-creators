# Onial Creators

Painel interno da equipe de conteúdo de Fortnite da Onial. Cada criador vê quanto ganhou, se está em dia com as postagens e com a meta de views, e usa ferramentas de IA para criar vídeos. O gestor (dono da equipe) cadastra criadores, define metas e registra pagamentos.

Todo o texto do site é em português do Brasil.

## Referência visual

`onial-creators.html` na raiz é o protótipo aprovado. Ele é a fonte da verdade para layout, telas, textos e comportamento. Copie o visual dele, não invente outro.

- Fundo preto, destaque dourado da coroa do logo (`#E8B014`), texto claro. Modo claro e escuro com os mesmos tokens do protótipo (`--bg`, `--panel`, `--line`, `--fg`, `--muted`, `--accent-text`, `--ok`, `--warn`...).
- Fontes: Rajdhani (títulos, números) e Inter (texto).
- Botão dourado sempre com texto escuro.
- Menu lateral: PRINCIPAL (Dashboard, Dias de postagem, Metas de views, Gravações, Ranking do mês), OTIMIZAÇÕES (Ideias & roteiros, Limpar narração, Avaliar vídeo, SEO para vídeos, Pomodoro), INFORMAÇÕES (Pagamentos, Minhas redes), EM BREVE (Meta coletiva). A aba Roteiros foi tirada a pedido do dono: a tradução do roteiro fica em cada vídeo da aba Ideias.
- No celular: barra fixa no topo (logo, BETA, nome da aba e botão ☰) e o menu abre pela lateral (decisão do dono).
- A Dashboard é só para informações rápidas. Funções novas ganham aba própria, nunca entram na Dashboard.

## Tecnologia

- Next.js (App Router) + TypeScript + Tailwind, hospedado na Vercel.
- Supabase: login por e-mail e senha, Postgres, Row Level Security em todas as tabelas.
- Chaves de API só em variáveis de ambiente do servidor. Nada de chave no navegador ou no código.

## Perfis e privacidade

- `criador`: vê só os próprios valores em dinheiro, metas, dias de postagem e pagamentos.
- `gestor`: vê e edita tudo.
- O ranking mostra só views. Um criador nunca pode ler o dinheiro de outro: bloqueie no banco (RLS), não só na tela.

## Regras de pagamento (não mude sem o gestor pedir)

- Bruto = views do mês ÷ 1.000 × R$ 5. Conta toda view ganha no mês, em TikTok + YouTube + Instagram, inclusive de vídeos antigos.
- Meta: individual por criador e por mês, definida pelo gestor. Se as views do mês ≥ meta, bônus = meta ÷ 1.000 × R$ 1. Se não bater, bônus = 0.
- Constância: cada criador tem 5 dias de postagem e 2 de folga por semana (definidos pelo gestor).
  - Perdeu um dia de postagem: pode repor postando em outro dia até domingo da mesma semana. Reposto não conta como falta.
  - Faltas no mês (dias não repostos até domingo): 0 faltas = 10% do bruto; 1 falta = 5%; 2 ou mais = 0%.
- Gravações (pedido do gestor): R$ 25 fixos por gravação em que o criador ajudou (qualquer duração), quando quem pediu ajuda confirma que ele estava presente. Conta no mês do dia da gravação. Tabelas pedidos_ajuda e ajudas; regras em `src/lib/gravar.ts`.
- Vídeos extras (pedido do gestor): o gestor cria um extra com valor, descrição, regras e o dia do vídeo (vale só nesse dia, 24h, 00:00–23:59); qualquer criador pode fazer, manda o link e o gestor aprova. O valor entra no mês da aprovação. Tabelas extras e entregas_extra.
- Total = bruto + bruto × constância% + bônus de meta + bônus de ajuda + extras aprovados.
- Valores em reais com duas casas, formato brasileiro (R$ 3.062,00).
- Toda mudança nessas regras precisa de testes automáticos cobrindo: mês perfeito, falta reposta na semana, 1 falta, 2 faltas, meta batida e não batida.

## Banco de dados (Fase 1)

perfis, contas_plataforma, videos, views_diarias, agenda_postagem, dias_postagem, metas, pagamentos. Mapa de cada dia da semana por criador: tabela mapa_dia (vale toda semana até o gestor trocar). Views ficam por vídeo e por dia; dinheiro é sempre calculado a partir delas.

## Integrações

- YouTube Data API + YouTube Analytics API (OAuth do próprio criador): foto e nome do canal no perfil + views diárias.
- Coleta automática (aba Minhas redes): cada criador conecta YouTube, TikTok e Instagram (OAuth); a Vercel roda `/api/coletar` todo dia às 06:00 de Brasília. YouTube Analytics dá views por dia; TikTok e Instagram dão o total, e o ganho do dia é a diferença (`src/lib/coleta/ganho.ts`). O lançamento manual do gestor fica como reserva.
- IA (API do Claude, `src/lib/ia/`): tradução FIEL do roteiro gringo para o português (não reescreve; só troca o nome do mapa citado pelo mapa da Onial e usa o glossário, ex.: cheat → hacker), feita na aba Ideias & roteiros. Aba SEO: títulos, descrições e hashtags para YouTube, TikTok e Instagram (`src/lib/ia/seo.ts`). Aba Avaliar vídeo: o criador envia o arquivo (em partes de 40 MiB para a pasta privada avaliacoes da Supabase), o servidor repassa ao Gemini (Files API), que assiste e dá notas de 0 a 10 para gancho, vídeo, som, edição e chamada (`src/lib/ia/avaliar.ts`, `src/lib/avaliar-regras.ts`); o vídeo é apagado depois e o resultado fica na tabela avaliacoes. Limite por criador em `src/lib/ia/uso.ts`.
- Ideias & roteiros: Shorts dos canais de referência que o gestor cadastra por mapa e tema (tabela canais_referencia). O YouTube não deixa baixar legenda de outros canais: o Gemini (API do Google, `GEMINI_API_KEY`, `src/lib/ia/gemini.ts`) assiste o Short público pelo link e transcreve; se falhar, o criador cola a transcrição. Traduções ficam guardadas na tabela traducoes (o próximo clique copia na hora).

## Como trabalhar neste projeto

- Uma funcionalidade por vez, na ordem das fases da especificação. Teste antes de seguir.
- Explique o que mudou em linguagem simples: o dono do projeto não é programador.
- Antes de qualquer coisa que apague dados ou mude regras de pagamento, pergunte.
