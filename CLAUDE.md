# Onial Creators

Painel interno da equipe de conteúdo de Fortnite da Onial. Cada criador vê quanto ganhou, se está em dia com as postagens e com a meta de views, e usa ferramentas de IA para criar vídeos. O gestor (dono da equipe) cadastra criadores, define metas e registra pagamentos.

Todo o texto do site é em português do Brasil.

## Referência visual

`onial-creators.html` na raiz é o protótipo aprovado. Ele é a fonte da verdade para layout, telas, textos e comportamento. Copie o visual dele, não invente outro.

- Fundo preto, destaque dourado da coroa do logo (`#E8B014`), texto claro. Modo claro e escuro com os mesmos tokens do protótipo (`--bg`, `--panel`, `--line`, `--fg`, `--muted`, `--accent-text`, `--ok`, `--warn`...).
- Fontes: Rajdhani (títulos, números) e Inter (texto).
- Botão dourado sempre com texto escuro.
- Menu lateral: PRINCIPAL (Dashboard, Dias de postagem, Metas de views, Pagamentos), OTIMIZAÇÕES (Ideias de vídeos, Roteiros, Áudio, Avaliar vídeo, Pomodoro), EQUIPE (Ranking do mês, Meta coletiva com selo EM BREVE).
- No celular, o menu vira uma barra no topo.
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
- Total = bruto + bruto × constância% + bônus de meta.
- Valores em reais com duas casas, formato brasileiro (R$ 3.062,00).
- Toda mudança nessas regras precisa de testes automáticos cobrindo: mês perfeito, falta reposta na semana, 1 falta, 2 faltas, meta batida e não batida.

## Banco de dados (Fase 1)

perfis, contas_plataforma, videos, views_diarias, agenda_postagem, dias_postagem, metas, pagamentos. Views ficam por vídeo e por dia; dinheiro é sempre calculado a partir delas.

## Integrações

- YouTube Data API + YouTube Analytics API (OAuth do próprio criador): foto e nome do canal no perfil + views diárias.
- TikTok e Instagram: na Fase 1 o gestor lança as views no painel. A integração automática é da Fase 2.
- IA (API do Claude): roteiros, adaptação de roteiro gringo para o público brasileiro, avaliação de vídeo. Fases 2 e 3.

## Como trabalhar neste projeto

- Uma funcionalidade por vez, na ordem das fases da especificação. Teste antes de seguir.
- Explique o que mudou em linguagem simples: o dono do projeto não é programador.
- Antes de qualquer coisa que apague dados ou mude regras de pagamento, pergunte.
