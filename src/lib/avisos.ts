/** Regras puras dos avisos (sem banco), para poder testar. */

/** Maior marco da meta já alcançado (50, 75, 90 ou 100%), ou null. */
export function marcoMeta(views: number, meta: number | null): 50 | 75 | 90 | 100 | null {
  if (!meta) return null;
  const p = (views / meta) * 100;
  return p >= 100 ? 100 : p >= 90 ? 90 : p >= 75 ? 75 : p >= 50 ? 50 : null;
}

export interface VideoSemana { id: string; titulo: string; plataforma: string; views: number }

/**
 * Vídeos "bombando": na última semana fizeram pelo menos 2× a média de views por vídeo do criador
 * (e no mínimo 1.000 views). Devolve no máximo 2, do maior para o menor.
 */
export function videosBombando(videos: VideoSemana[]): (VideoSemana & { vezes: number })[] {
  const com = videos.filter((v) => v.views > 0);
  if (com.length < 3) return []; // poucos vídeos: a média não diz nada
  const media = com.reduce((a, v) => a + v.views, 0) / com.length;
  return com
    .filter((v) => v.views >= Math.max(1000, media * 2))
    .sort((a, b) => b.views - a.views)
    .slice(0, 2)
    .map((v) => ({ ...v, vezes: Math.round((v.views / media) * 10) / 10 }));
}
