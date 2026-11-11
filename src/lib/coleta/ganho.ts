/**
 * Views ganhas num dia a partir do total acumulado (TikTok e Instagram só informam o total).
 *
 * - Vídeo já acompanhado: ganho = total novo − total anterior (nunca negativo: as redes às vezes recontam para baixo).
 * - Vídeo visto pela primeira vez:
 *     - postado no dia do ganho ou depois → todas as views contam (é um vídeo novo).
 *     - postado antes → só marca o ponto de partida; as views antigas já foram ganhas antes da conexão.
 */
export function viewsGanhas(totalAnterior: number | null, totalNovo: number, postadoEm: string, diaDoGanho: string): number {
  const novo = Math.max(0, Math.floor(totalNovo));
  if (totalAnterior === null) return postadoEm >= diaDoGanho ? novo : 0;
  return Math.max(0, novo - totalAnterior);
}

/**
 * Total de views a guardar no vídeo depois de uma coleta: nunca desce.
 * Se a rede devolver um total menor (recontagem ou falha que manda 0), fica o maior já visto.
 * Assim, quando o total volta ao normal, só o que passou do maior conta como ganho (e não o total inteiro de novo).
 */
export function totalGuardado(anterior: number | null, totalNovo: number): number {
  const novo = Math.max(0, Math.floor(totalNovo));
  return anterior === null ? novo : Math.max(anterior, novo);
}

/**
 * Instagram: views de "Outros conteúdos" a gravar no dia de ontem.
 *
 * Os reels são medidos pela diferença dos totais entre uma coleta e outra (06:00 → 06:00), e o total da conta
 * vem por dia do calendário (00:00 → 24:00). Comparar dia por dia e só somar quando sobra fazia o Instagram
 * contar a mais (nos dias em que os reels passavam do total, a diferença era jogada fora).
 * Por isso a conta é feita no mês acumulado: reels + outros do mês nunca passam do total da conta no mês.
 *
 * - contaMes: total de views da conta do dia 1 do mês até ontem (sem stories)
 * - reelsMes: views dos reels já gravadas no mês até ontem
 * - outrosAntes: "Outros conteúdos" já gravados no mês, antes de ontem
 */
export function outrosInstagram(contaMes: number, reelsMes: number, outrosAntes: number): number {
  return Math.max(0, Math.floor(contaMes - reelsMes - outrosAntes));
}

/**
 * Instagram: refaz "Outros conteúdos" do mês inteiro a cada coleta.
 *
 * O total da conta que o Instagram informa nos primeiros dias pode vir alto e ser corrigido para baixo depois.
 * Antes, o que já estava gravado ficava travado e as views a mais nunca saíam (em 02/11/2026 isso somou 90 mil
 * views a um criador). Agora o alvo do mês é sempre "total da conta no mês − reels do mês":
 * - se o alvo subiu, a diferença vai para ontem;
 * - se o alvo caiu, ontem fica 0 e o excesso sai dos dias anteriores, do mais recente para o mais antigo.
 *
 * - contaMes: total de views da conta do dia 1 do mês até ontem (sem stories)
 * - reelsMes: views dos reels gravadas no mês até ontem
 * - anteriores: "Outros conteúdos" já gravados no mês, antes de ontem
 * Devolve o valor de ontem e os dias anteriores que precisam ser regravados (com o valor novo).
 */
export function refazerOutrosInstagram(contaMes: number, reelsMes: number, anteriores: { dia: string; views: number }[]): { ontem: number; corrigir: { dia: string; views: number }[] } {
  const alvo = Math.max(0, Math.floor(contaMes - reelsMes));
  const soma = anteriores.reduce((a, d) => a + d.views, 0);
  if (alvo >= soma) return { ontem: alvo - soma, corrigir: [] };
  let excesso = soma - alvo;
  const corrigir: { dia: string; views: number }[] = [];
  for (const d of [...anteriores].sort((a, b) => (a.dia < b.dia ? 1 : -1))) {
    if (excesso <= 0) break;
    const tira = Math.min(d.views, excesso);
    if (tira <= 0) continue;
    corrigir.push({ dia: d.dia, views: d.views - tira });
    excesso -= tira;
  }
  return { ontem: 0, corrigir };
}
