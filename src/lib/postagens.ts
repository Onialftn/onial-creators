/** Dias de postagem a partir dos vídeos coletados das redes. */
export interface VideoPostado { plataforma: string; postado_em: string; id_externo: string | null; titulo: string | null }

/** Só vídeos de verdade: tira os registros de "outros", os lançados à mão pelo gestor e os sem data real. */
export function ehPostagem(v: VideoPostado): boolean {
  const id = v.id_externo ?? "";
  if (!id || id.startsWith("http") || id.startsWith("__outros__")) return false;
  return v.titulo !== "Vídeo do YouTube"; // data desconhecida (ainda não confirmada pelo YouTube)
}

/**
 * Postagens por dia. O mesmo vídeo repostado em várias redes conta 1: em cada dia vale a rede
 * com mais vídeos (2 vídeos diferentes no YouTube no mesmo dia = 2; 1 vídeo nas 3 redes = 1).
 */
export function postagensPorDia(videos: VideoPostado[]): Map<string, number> {
  const porDiaRede = new Map<string, Map<string, number>>();
  for (const v of videos) {
    if (!ehPostagem(v)) continue;
    const m = porDiaRede.get(v.postado_em) ?? new Map<string, number>();
    m.set(v.plataforma, (m.get(v.plataforma) ?? 0) + 1);
    porDiaRede.set(v.postado_em, m);
  }
  return new Map([...porDiaRede].map(([dia, m]) => [dia, Math.max(...m.values())]));
}
