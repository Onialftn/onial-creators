import "server-only";
import { unstable_cache } from "next/cache";
import { tokensValidos } from "@/lib/coleta/coletar";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface VideoCanal { titulo: string; publicadoEm: string; views: number }

async function g<T>(url: string, token: string): Promise<T> {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`YouTube ${r.status}`);
  return (await r.json()) as T;
}

/** Últimos ~100 vídeos do canal do YouTube do criador, com título, data e views (guardado por 6h). */
export function videosDoMeuCanal(criadorId: string): Promise<VideoCanal[] | null> {
  return unstable_cache(async () => {
    const admin = supabaseAdmin();
    const { data: conta } = await admin.from("contas_plataforma").select("id").eq("criador_id", criadorId).eq("plataforma", "youtube").maybeSingle();
    if (!conta) return null;
    const { access } = await tokensValidos(admin, conta.id, "youtube");
    const ch = await g<{ items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] }>("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true", access);
    const uploads = ch.items?.[0]?.contentDetails.relatedPlaylists.uploads;
    if (!uploads) return [];
    const ids: string[] = [];
    let pagina = "";
    for (let i = 0; i < 2; i++) {
      const pl = await g<{ items?: { contentDetails: { videoId: string } }[]; nextPageToken?: string }>(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}${pagina ? `&pageToken=${pagina}` : ""}`, access);
      ids.push(...(pl.items ?? []).map((x) => x.contentDetails.videoId));
      if (!pl.nextPageToken) break;
      pagina = pl.nextPageToken;
    }
    const out: VideoCanal[] = [];
    for (let i = 0; i < ids.length; i += 50) {
      const v = await g<{ items?: { snippet: { title: string; publishedAt: string }; statistics: { viewCount?: string } }[] }>(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.slice(i, i + 50).join(",")}`, access);
      for (const x of v.items ?? []) out.push({ titulo: x.snippet.title, publicadoEm: x.snippet.publishedAt, views: Number(x.statistics.viewCount ?? 0) });
    }
    return out;
  }, ["seo-canal", criadorId], { revalidate: 6 * 3600 })();
}

export interface VideoRecente { id: string; titulo: string; publicadoEm: string; views: number; likes: number; comentarios: number; capa: string }

/** Os últimos vídeos postados no canal do YouTube do criador, com views, likes e comentários (guardado por 30 min). */
export function ultimosVideos(criadorId: string, quantos = 3): Promise<VideoRecente[] | null> {
  return unstable_cache(async () => {
    const admin = supabaseAdmin();
    const { data: conta } = await admin.from("contas_plataforma").select("id").eq("criador_id", criadorId).eq("plataforma", "youtube").maybeSingle();
    if (!conta) return null;
    const { access } = await tokensValidos(admin, conta.id, "youtube");
    const ch = await g<{ items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] }>("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true", access);
    const uploads = ch.items?.[0]?.contentDetails.relatedPlaylists.uploads;
    if (!uploads) return [];
    const pl = await g<{ items?: { contentDetails: { videoId: string } }[] }>(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${quantos}&playlistId=${uploads}`, access);
    const ids = (pl.items ?? []).map((x) => x.contentDetails.videoId);
    if (!ids.length) return [];
    type V = { id: string; snippet: { title: string; publishedAt: string; thumbnails?: Record<string, { url: string }> }; statistics: { viewCount?: string; likeCount?: string; commentCount?: string } };
    const v = await g<{ items?: V[] }>(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(",")}`, access);
    return (v.items ?? [])
      .map((x) => ({
        id: x.id,
        titulo: x.snippet.title,
        publicadoEm: x.snippet.publishedAt,
        views: Number(x.statistics.viewCount ?? 0),
        likes: Number(x.statistics.likeCount ?? 0),
        comentarios: Number(x.statistics.commentCount ?? 0),
        capa: x.snippet.thumbnails?.medium?.url ?? x.snippet.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${x.id}/mqdefault.jpg`,
      }))
      .sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm));
  }, ["ultimos-videos", criadorId, String(quantos)], { revalidate: 1800 })();
}
