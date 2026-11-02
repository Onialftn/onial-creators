import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tokensValidos } from "./coletar";
import { capasInstagram, capasTikTok } from "./redes";

/**
 * Capas dos vídeos do TikTok e do Instagram de um criador (id na rede → link da imagem).
 * Guardado por 1 hora: os links dessas redes vencem com o tempo.
 */
export function capasDoCriador(criadorId: string, videos: { plataforma: string; idExterno?: string | null }[]): Promise<Record<string, string>> {
  const tk = videos.filter((v) => v.plataforma === "tiktok" && v.idExterno).map((v) => v.idExterno!).sort();
  const ig = videos.filter((v) => v.plataforma === "instagram" && v.idExterno).map((v) => v.idExterno!).sort();
  if (!tk.length && !ig.length) return Promise.resolve({});
  return unstable_cache(async () => {
    const admin = supabaseAdmin();
    const { data: contas } = await admin.from("contas_plataforma").select("id, plataforma").eq("criador_id", criadorId).in("plataforma", ["tiktok", "instagram"]);
    const out: Record<string, string> = {};
    for (const c of contas ?? []) {
      const ids = c.plataforma === "tiktok" ? tk : ig;
      if (!ids.length) continue;
      try {
        const t = await tokensValidos(admin, c.id as string, c.plataforma as "tiktok" | "instagram");
        const m = c.plataforma === "tiktok" ? await capasTikTok(t, ids) : await capasInstagram(t, ids);
        m.forEach((u, id) => (out[id] = u));
      } catch { /* sem capa: mostra o logo da rede */ }
    }
    return out;
  }, ["capas", criadorId, ...tk, ...ig], { revalidate: 3600 })();
}
