/** Contas do Avaliar vídeo (sem banco nem internet), para poder testar. */

/** Tamanho de cada parte do envio: 40 MiB (cabe no limite de 50 MB da Supabase e é múltiplo de 8 MiB, o pedaço do Google). */
export const TAMANHO_PARTE = 40 * 1024 * 1024;
export const TAMANHO_MAX = 400 * 1024 * 1024;
export const TIPOS_VIDEO = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];

export const partesDe = (tamanho: number) => Math.max(1, Math.ceil(tamanho / TAMANHO_PARTE));

export type Criterio = "gancho" | "video" | "som" | "edicao" | "chamada";
export const CRITERIOS: { id: Criterio; nome: string; peso: number; explica: string }[] = [
  { id: "gancho", nome: "Gancho", peso: 30, explica: "Os 3 primeiros segundos prendem?" },
  { id: "video", nome: "Vídeo", peso: 20, explica: "Imagem, qualidade e enquadramento vertical" },
  { id: "som", nome: "Som", peso: 20, explica: "Voz clara, volume e música" },
  { id: "edicao", nome: "Edição", peso: 20, explica: "Ritmo, cortes e legendas" },
  { id: "chamada", nome: "Mapa e chamada", peso: 10, explica: "Mostra o mapa da Onial e chama para jogar ou seguir" },
];

export interface Avaliacao {
  nota: number;
  resumo: string;
  criterios: Record<Criterio, { nota: number; comentario: string }>;
  pontos_fortes: string[];
  melhorias: { tempo: string; dica: string }[];
}

/** Nota geral 0 a 100 = média ponderada das notas 0 a 10 de cada critério. */
export function notaGeral(c: Avaliacao["criterios"]): number {
  const total = CRITERIOS.reduce((a, k) => a + Math.min(10, Math.max(0, Number(c[k.id]?.nota) || 0)) * k.peso, 0);
  return Math.round(total / 10);
}

/** Confere e arruma o que a IA respondeu (notas entre 0 e 10, listas curtas, tempos no formato 0:03). */
export function normalizarAvaliacao(bruto: unknown): Avaliacao {
  const d = (bruto ?? {}) as Partial<Avaliacao> & { criterios?: Record<string, { nota?: unknown; comentario?: unknown }> };
  const criterios = Object.fromEntries(
    CRITERIOS.map((k) => {
      const x: { nota?: unknown; comentario?: unknown } = d.criterios?.[k.id] ?? {};
      return [k.id, { nota: Math.min(10, Math.max(0, Math.round(Number(x.nota) || 0))), comentario: String(x.comentario ?? "").trim() }];
    }),
  ) as Avaliacao["criterios"];
  const tempo = (t: unknown) => (/^\d{1,2}:\d{2}$/.test(String(t ?? "").trim()) ? String(t).trim() : "");
  return {
    nota: notaGeral(criterios),
    resumo: String(d.resumo ?? "").trim(),
    criterios,
    pontos_fortes: (Array.isArray(d.pontos_fortes) ? d.pontos_fortes : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3),
    melhorias: (Array.isArray(d.melhorias) ? d.melhorias : [])
      .map((m) => ({ tempo: tempo((m as { tempo?: unknown }).tempo), dica: String((m as { dica?: unknown }).dica ?? "").trim() }))
      .filter((m) => m.dica)
      .slice(0, 6),
  };
}

/** "0:03" → 3 segundos (para pular o vídeo até o ponto da dica). */
export const segundos = (t: string) => { const [m, s] = t.split(":").map(Number); return (m || 0) * 60 + (s || 0); };
