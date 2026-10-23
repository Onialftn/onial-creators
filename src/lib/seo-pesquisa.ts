import "server-only";
import { unstable_cache } from "next/cache";
import { segundosISO, tokenYoutube, yt } from "@/lib/ideias";
import { maisFrequentes, notaPalavraChave, palavras } from "@/lib/seo-nota";

export interface VideoBusca { id: string; titulo: string; canal: string; publicado: string; views: number; porDia: number }
export interface Pesquisa {
  termo: string;
  nota: number;
  procura: "baixa" | "média" | "alta";
  concorrencia: "baixa" | "média" | "alta";
  totalResultados: number;
  medianaPorDia: number;
  videos: VideoBusca[];
  tags: { item: string; qtd: number }[];
  palavras: { item: string; qtd: number }[];
}

/** Busca Shorts do YouTube (Brasil, últimos 30 dias) e mede procura, concorrência e o que os melhores usam. */
async function pesquisar(termo: string): Promise<Pesquisa> {
  const token = await tokenYoutube();
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const p = new URLSearchParams({ part: "id", q: termo, type: "video", videoDuration: "short", order: "viewCount", publishedAfter: desde, regionCode: "BR", relevanceLanguage: "pt", maxResults: "50" });
  const busca = await yt<{ pageInfo?: { totalResults?: number }; items?: { id: { videoId: string } }[] }>(`search?${p}`, token);
  const ids = (busca.items ?? []).map((i) => i.id.videoId).filter(Boolean);
  const det = ids.length
    ? await yt<{ items?: { id: string; snippet: { title: string; channelTitle: string; publishedAt: string; tags?: string[] }; statistics?: { viewCount?: string }; contentDetails: { duration: string } }[] }>(`videos?part=snippet,statistics,contentDetails&id=${ids.join(",")}`, token)
    : { items: [] };
  const agora = Date.now();
  const lista = (det.items ?? [])
    .filter((v) => segundosISO(v.contentDetails.duration) <= 180)
    .map((v) => {
      const views = Number(v.statistics?.viewCount ?? 0);
      const dias = Math.max(0.25, (agora - new Date(v.snippet.publishedAt).getTime()) / 86_400_000);
      return { id: v.id, titulo: v.snippet.title, canal: v.snippet.channelTitle, publicado: v.snippet.publishedAt, views, porDia: Math.round(views / dias), tags: v.snippet.tags ?? [] };
    });
  const porDia = lista.map((v) => v.porDia).sort((a, b) => a - b);
  const mediana = porDia.length ? porDia[Math.floor(porDia.length / 2)] : 0;
  const total = busca.pageInfo?.totalResults ?? lista.length;
  const n = notaPalavraChave(mediana, total);
  const melhores = [...lista].sort((a, b) => b.porDia - a.porDia).slice(0, 20);
  return {
    termo,
    ...n,
    totalResultados: total,
    medianaPorDia: mediana,
    videos: melhores.slice(0, 10).map((v) => ({ id: v.id, titulo: v.titulo, canal: v.canal, publicado: v.publicado, views: v.views, porDia: v.porDia })),
    tags: maisFrequentes(melhores.flatMap((v) => [...new Set(v.tags.map((t) => t.toLowerCase().trim()))]).filter((t) => t.length > 1 && t.length < 40), 20),
    palavras: maisFrequentes(melhores.flatMap((v) => [...new Set(palavras(v.titulo))]), 15),
  };
}

/** Guardado por 6 horas por termo (cada busca do YouTube gasta bastante da cota diária). */
export const pesquisarPalavra = (termo: string) => {
  const t = termo.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  return unstable_cache(() => pesquisar(t), ["seo-pesquisa", t], { revalidate: 21_600 })();
};
