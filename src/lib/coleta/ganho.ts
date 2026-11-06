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
