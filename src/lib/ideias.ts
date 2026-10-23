import "server-only";
import { unstable_cache } from "next/cache";
import { tokensValidos } from "@/lib/coleta/coletar";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Vídeos dos canais de referência (YouTube). Usa a autorização de uma conta do YouTube já conectada
 * (dados públicos), e guarda o resultado por 3 horas para não gastar a cota da API.
 */
export interface VideoRef { id: string; titulo: string; canal: string; publicado: string; views: number; capa: string; segundos: number; porDia?: number }

async function tokenYoutube() {
  const admin = supabaseAdmin();
  const { data: contas } = await admin.from("contas_plataforma").select("id").eq("plataforma", "youtube").is("erro", null).limit(5);
  for (const c of contas ?? []) {
    try { return (await tokensValidos(admin, c.id as string, "youtube")).access; } catch { /* tenta a próxima */ }
  }
  throw new Error("Nenhuma conta do YouTube conectada no site. Conecte em Minhas redes.");
}

async function yt<T>(caminho: string, token: string): Promise<T> {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${caminho}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`YouTube: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json() as Promise<T>;
}

/** "PT1M5S" → 65 */
export function segundosISO(d: string) {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d) ?? [];
  return (+(m[1] ?? 0)) * 86400 + (+(m[2] ?? 0)) * 3600 + (+(m[3] ?? 0)) * 60 + (+(m[4] ?? 0));
}

async function buscar(canais: string[]): Promise<VideoRef[]> {
  if (!canais.length) return [];
  const token = await tokenYoutube();
  type Canal = { id: string; snippet: { title: string }; contentDetails: { relatedPlaylists: { uploads: string } } };
  // canais guardados pelo código (UC...) vão juntos; os guardados pelo @nome são buscados um a um
  const porId = canais.filter((c) => !c.startsWith("@"));
  const porNome = canais.filter((c) => c.startsWith("@"));
  const listas = await Promise.all([
    porId.length ? yt<{ items?: Canal[] }>(`channels?part=snippet,contentDetails&id=${porId.join(",")}`, token) : Promise.resolve({ items: [] as Canal[] }),
    ...porNome.map((h) => yt<{ items?: Canal[] }>(`channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(h)}`, token).catch(() => ({ items: [] as Canal[] }))),
  ]);
  const ch = { items: listas.flatMap((l) => l.items ?? []) };
  const ids: string[] = [];
  const nomeCanal = new Map<string, string>();
  await Promise.all((ch.items ?? []).map(async (c) => {
    nomeCanal.set(c.id, c.snippet.title);
    const p = await yt<{ items?: { contentDetails: { videoId: string } }[] }>(`playlistItems?part=contentDetails&maxResults=50&playlistId=${c.contentDetails.relatedPlaylists.uploads}`, token).catch(() => ({ items: [] }));
    for (const it of p.items ?? []) ids.push(it.contentDetails.videoId);
  }));
  const out: VideoRef[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const v = await yt<{ items?: { id: string; snippet: { title: string; channelId: string; publishedAt: string }; statistics?: { viewCount?: string }; contentDetails: { duration: string } }[] }>(`videos?part=snippet,statistics,contentDetails&id=${ids.slice(i, i + 50).join(",")}`, token);
    for (const x of v.items ?? []) {
      out.push({ id: x.id, titulo: x.snippet.title, canal: nomeCanal.get(x.snippet.channelId) ?? "", publicado: x.snippet.publishedAt, views: Number(x.statistics?.viewCount ?? 0), capa: `https://i.ytimg.com/vi/${x.id}/oardefault.jpg`, segundos: segundosISO(x.contentDetails.duration) });
    }
  }
  // só vídeos curtos (Shorts têm até 3 minutos)
  return out.filter((v) => v.segundos > 0 && v.segundos <= 180).sort((a, b) => b.publicado.localeCompare(a.publicado));
}

export const videosDosCanais = (canais: string[]) => unstable_cache(() => buscar(canais), ["ideias", ...[...canais].sort()], { revalidate: 10800 })();

/** Acha o canal pelo link (youtube.com/@nome, /channel/UC..., ou só @nome). */
export async function resolverCanal(entrada: string) {
  const t = entrada.trim();
  const token = await tokenYoutube();
  const porId = /(UC[\w-]{22})/.exec(t)?.[1];
  const handle = porId ? null : (/@([\w.\-]+)/.exec(t)?.[1] ?? (/^[\w.\-]+$/.test(t) ? t : null));
  if (!porId && !handle) throw new Error("Cole o link do canal (ex.: youtube.com/@nomedocanal).");
  const d = await yt<{ items?: { id: string; snippet: { title: string; thumbnails?: { default?: { url: string } } } }[] }>(`channels?part=snippet&${porId ? `id=${porId}` : `forHandle=${encodeURIComponent("@" + handle)}`}`, token);
  const c = d.items?.[0];
  if (!c) throw new Error("Não achei esse canal no YouTube. Confira o link.");
  return { canal_id: c.id, nome: c.snippet.title, foto_url: c.snippet.thumbnails?.default?.url ?? null };
}
