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
