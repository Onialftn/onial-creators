# Onial Creators

Painel interno da equipe de conteúdo de Fortnite da Onial. Cada criador vê quanto ganhou, se está em dia com as postagens e com a meta de views, e usa ferramentas de IA para criar vídeos. O gestor (dono da equipe) cadastra criadores, define metas e registra pagamentos.

Todo o texto do site é em português do Brasil.

## Referência visual

`onial-creators.html` na raiz é o protótipo aprovado. Ele é a fonte da verdade para layout, telas, textos e comportamento. Copie o visual dele, não invente outro.

- Fundo preto, destaque dourado da coroa do logo (`#E8B014`), texto claro. Modo claro e escuro com os mesmos tokens do protótipo (`--bg`, `--panel`, `--line`, `--fg`, `--muted`, `--accent-text`, `--ok`, `--warn`...).
- Fontes: Rajdhani (títulos, números) e Inter (texto).
- Botão dourado sempre com texto escuro.
- Menu lateral: PRINCIPAL (Dashboard, Dias de postagem, Metas de views, Gravações, Ranking do mês), OTIMIZAÇÕES (Ideias & roteiros, Limpar narração, Avaliar vídeo, SEO para vídeos, Pomodoro), INFORMAÇÕES (Pagamentos, Minhas redes); Configurações fica no pé do menu, logo acima do botão de modo claro/escuro, EM BREVE (Meta coletiva). A aba Roteiros foi tirada a pedido do dono: a tradução do roteiro fica em cada vídeo da aba Ideias.
- No celular: barra fixa no topo (logo, BETA, nome da aba e botão ☰) e o menu abre pela lateral (decisão do dono).
- A Dashboard é só para informações rápidas. Funções novas ganham aba própria, nunca entram na Dashboard.
- Menu em pastas (pedido do dono): cada grupo abre e fecha, com ícone, nome, número de abas e seta. A pasta Principal e a pasta da aba atual ficam abertas. Para o gestor, "Painel do gestor" (ícone de coroa) fica sozinho logo acima da pasta Principal, sem pasta própria. O gestor entra direto nele ao fazer login (a Dashboard redireciona o gestor para /gestor).
- Notificações, Novidades e Sugestões ficam em três quadradinhos lado a lado no topo do menu (no celular, o sino fica na barra do topo).
- Semana em bolinhas da Dashboard (pedido do dono): cinza = folga, amarelo = dia de postar, vermelho com X = falta, verde = feito. Cores fixas `--folga`, `--ouro`, `--falta` (não mudam com o tema).
- Dashboard do criador (modelo A, escolhido pelo dono entre 3 modelos): em cima, o valor do mês com a conta dele (bruto, constância, bônus de meta, gravações, extras) e o gráfico do ganho bruto de cada dia (`src/components/GraficoMes.tsx`); depois, as views de cada rede com a parte de cada uma; embaixo, meta, semana em bolinhas e o top 3 do ranking com a foto e o nome de cada criador (`MetaCompacta`, `SemanaBolinhas`, `RankingTop3` em `src/components/Blocos.tsx`). As views de cada dia vêm da view views_por_dia (migração 0024), com reserva lendo views_diarias.
- Ideias & roteiros (modelo D, escolhido pelo dono): mapa e tema lado a lado num quadro só; os vídeos ficam em fileiras de capas que deslizam para o lado, estilo Netflix (Em alta com o número grande da posição, Recentes, Curtidos). A capa só tem "Assistir": curtir e copiar o roteiro ficam no player, depois de assistir (pedido do dono).
- Aba Configurações (pedido do dono, `src/components/Configuracoes.tsx`): cor do site em 5 temas (Original dourado, Vermelho, Verde, Azul, Roxo), modo escuro/claro/igual ao aparelho, texto normal/grande e animações normais/poucas. Fica salvo no aparelho (localStorage) e o script de `src/app/layout.tsx` aplica antes da página aparecer. Os temas trocam `--gold`, `--accent-text`, `--accent-vivo` e os tons ligados a eles (`globals.css`): use sempre `var(--gold)` e nunca o hex do dourado no código, senão aquela parte não muda de cor. Exceção, pedido do dono: o que o dourado destaca de propósito fica com cor fixa e NÃO muda com o tema. Isso vale para posições do ranking (`COR_POSICAO` em `Blocos.tsx`: ouro, prata, bronze), coroa e "Mais viral", 1º lugar, totais de dinheiro e metas e a nota "média" (amarelo) das avaliações. Use `--ouro`, `--ouro-texto`, `--ouro-vivo`, `--prata`, `--prata-texto`, `--bronze` e `--bronze-texto`. Botões, links, ícones, menu e seleção seguem o tema.
- Painel do gestor, Visão geral (modelo C, escolhido pelo dono): avisos numa faixa de etiquetas clicáveis no topo; gráfico das views da equipe por dia (`GraficoEquipe` em `GraficoMes.tsx`) ao lado do "Dinheiro do mês", uma barra com bruto, constância, metas, gravações e extras nas cores `--cat-1` a `--cat-5` (paleta validada para daltonismo, fixa), mais os meses fechados a pagar e o gasto com ferramentas; embaixo, cada criador numa barra de views com um traço na meta (`.linha-criador`).
- Páginas compridas ficam divididas em abinhas no topo (`src/components/Abas.tsx`), para não precisar descer a página: Metas de views (Resumo, Vídeos do mês, Histórico), ficha do criador no painel do gestor (Vídeos, Meta e dias, Pagamentos, Correções) e Configurações do gestor. Vários quadros na mesma aba vão dentro de `<Grupo>`.

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
- Constância: cada criador tem de 3 a 5 dias de postagem por semana (o resto é folga), definidos pelo gestor.
  - Perdeu um dia de postagem (regra do gestor de 11/11/2026, vale para faltas a partir de 09/11/2026, `REPOSICAO_MARCADA_DESDE`): o criador marca na aba Dias de postagem um dia para repor, até 7 dias depois da falta e sem passar do último dia do mês, e posta 1 vídeo a mais nele (qualquer dia; em dia de postagem são 2 vídeos). Uma data por falta, não dá para trocar. Não postou no dia marcado: vira falta na hora. Não marcou até o prazo: vira falta. Vídeo a mais sem data marcada não repõe. Tabela reposicoes (migração 0026); regras em `situacaoDasFaltas` (`src/lib/pagamento.ts`), tela em `src/components/ReporFaltas.tsx`.
  - Faltas antes de 09/11/2026 seguem a regra antiga: repor postando em outro dia até domingo da mesma semana, sem marcar data.
  - Mínimo de 1 vídeo por dia de postagem. Vídeo extra (pago à parte) nunca conta como reposição (`sobraParaRepor` em `src/lib/pagamento.ts`).
  - Faltas no mês (dias não repostos): 0 faltas = 10% do bruto; 1 falta = 5%; 2 ou mais = 0%.
  - Faltas só contam a partir de 31/10/2026 (o gestor zerou todas as faltas): `INICIO_CONSTANCIA` em `src/lib/pagamento.ts`. Antes disso nenhum dia é obrigatório e os vídeos desses dias não repõem faltas.
- Gravações (pedido do gestor): R$ 25 fixos por gravação em que o criador ajudou (qualquer duração), quando quem pediu ajuda confirma que ele estava presente. Conta no mês do dia da gravação. Tabelas pedidos_ajuda e ajudas; regras em `src/lib/gravar.ts`.
- Vídeos extras (pedido do gestor): o gestor cria um extra com valor, descrição, regras e o dia do vídeo (vale só nesse dia, das 08:00 às 22:00 de Brasília; o link só é aceito nesse horário); qualquer criador pode fazer, manda o link e o gestor aprova. O valor entra no mês da aprovação. Tabelas extras e entregas_extra.
- Total = bruto + bruto × constância% + bônus de meta + bônus de ajuda + extras aprovados.
- Valores em reais com duas casas, formato brasileiro (R$ 3.062,00).
- Toda mudança nessas regras precisa de testes automáticos cobrindo: mês perfeito, falta reposta no dia marcado, 1 falta, 2 faltas, meta batida e não batida.

## Banco de dados (Fase 1)

perfis, contas_plataforma, videos, views_diarias, agenda_postagem, dias_postagem, metas, pagamentos. Mapa de cada dia da semana por criador: tabela mapa_dia (vale toda semana até o gestor trocar). Views ficam por vídeo e por dia; dinheiro é sempre calculado a partir delas.

## Integrações

- YouTube Data API + YouTube Analytics API (OAuth do próprio criador): foto e nome do canal no perfil + views diárias.
- Coleta automática (aba Minhas redes): cada criador conecta YouTube, TikTok e Instagram (OAuth); a Vercel roda `/api/coletar` todo dia às 06:00 de Brasília. YouTube Analytics dá views por dia; TikTok e Instagram dão o total, e o ganho do dia é a diferença (`src/lib/coleta/ganho.ts`). No Instagram, "Outros conteúdos" (o que a conta tem a mais que os reels) é calculado no mês acumulado (`outrosInstagram`), para não contar a mais: reels + outros do mês nunca passam do total da conta no mês. As views de um dia ficam sempre na mesma rede e no mesmo criador do vídeo (trava da migração 0025). Para conferir dados de um criador: `docs/conferir-views.sql`. O lançamento manual do gestor fica como reserva.
- IA (API do Claude, `src/lib/ia/`): tradução FIEL do roteiro gringo para o português (não reescreve; só troca o nome do mapa citado pelo mapa da Onial e usa o glossário, ex.: cheat → hacker), feita na aba Ideias & roteiros. Aba SEO: títulos, descrições e hashtags para YouTube, TikTok e Instagram (`src/lib/ia/seo.ts`). Aba Avaliar vídeo: o criador envia o arquivo (em partes de 40 MiB para a pasta privada avaliacoes da Supabase), o servidor repassa ao Gemini (Files API), que assiste e dá notas de 0 a 10 para gancho, vídeo, som, edição e chamada (`src/lib/ia/avaliar.ts`, `src/lib/avaliar-regras.ts`); o vídeo é apagado depois e o resultado fica na tabela avaliacoes. Limite por criador em `src/lib/ia/uso.ts`.
- Ideias & roteiros: Shorts dos canais de referência que o gestor cadastra por mapa e tema (tabela canais_referencia). O YouTube não deixa baixar legenda de outros canais: o Gemini (API do Google, `GEMINI_API_KEY`, `src/lib/ia/gemini.ts`) assiste o Short público pelo link e transcreve; se falhar, o criador cola a transcrição. Traduções ficam guardadas na tabela traducoes (o próximo clique copia na hora).

## Como trabalhar neste projeto

- Uma funcionalidade por vez, na ordem das fases da especificação. Teste antes de seguir.
- Explique o que mudou em linguagem simples: o dono do projeto não é programador.
- Antes de qualquer coisa que apague dados ou mude regras de pagamento, pergunte.
