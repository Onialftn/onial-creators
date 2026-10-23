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
