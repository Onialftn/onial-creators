import "server-only";

/**
 * Conexão e leitura das três redes. Cada criador autoriza a própria conta (OAuth);
 * os tokens ficam só no servidor, na tabela tokens_plataforma.
 */
export type Rede = "youtube" | "tiktok" | "instagram";
export const REDES: Rede[] = ["youtube", "tiktok", "instagram"];

export interface Tokens { access: string; refresh: string | null; expiraEm: Date | null }
export interface Perfil { contaExternaId: string; nome: string; foto: string | null }
export interface VideoRede { idExterno: string; titulo: string; url: string | null; postadoEm: string; viewsTotal?: number }

const env = (k: string) => {
  const v = process.env[k]?.trim();
  if (!v) throw new Error(`Falta a variável ${k} na Vercel.`);
  return v;
};
export function redeConfigurada(r: Rede): boolean {
  const k = { youtube: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"], instagram: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"] }[r];
  return k.every((x) => !!process.env[x]);
}
const expira = (seg?: number) => (seg ? new Date(Date.now() + (seg - 60) * 1000) : null);
async function json<T>(r: Response, onde: string): Promise<T> {
  const t = await r.text();
  if (!r.ok) throw new Error(`${onde}: ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t) as T;
}
const dataBR = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

/* ======================= YouTube ======================= */
const yt = {
  autorizar(redirect: string, state: string) {
    const p = new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"), redirect_uri: redirect, response_type: "code", state,
      scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
      access_type: "offline", prompt: "consent", include_granted_scopes: "true",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  },
  async trocar(code: string, redirect: string): Promise<Tokens> {
    const d = await json<{ access_token: string; refresh_token?: string; expires_in: number }>(
      await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ code, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), redirect_uri: redirect, grant_type: "authorization_code" }) }),
      "Google token",
    );
    return { access: d.access_token, refresh: d.refresh_token ?? null, expiraEm: expira(d.expires_in) };
  },
  async renovar(t: Tokens): Promise<Tokens> {
    if (!t.refresh) throw new Error("Sem refresh token do YouTube: o criador precisa conectar de novo.");
    const d = await json<{ access_token: string; expires_in: number }>(
      await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), refresh_token: t.refresh, grant_type: "refresh_token" }) }),
      "Google renovar",
    );
    return { access: d.access_token, refresh: t.refresh, expiraEm: expira(d.expires_in) };
  },
  async perfil(t: Tokens): Promise<Perfil> {
    const d = await json<{ items?: { id: string; snippet: { title: string; thumbnails?: { default?: { url: string }; medium?: { url: string }; high?: { url: string } } } }[] }>(
      await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${t.access}` } }),
      "YouTube canal",
    );
    const c = d.items?.[0];
    if (!c) throw new Error("Essa conta Google não tem canal do YouTube.");
    return { contaExternaId: c.id, nome: c.snippet.title, foto: c.snippet.thumbnails?.high?.url ?? c.snippet.thumbnails?.medium?.url ?? c.snippet.thumbnails?.default?.url ?? null };
  },
  /** vídeos enviados (mais recentes primeiro, até 200) */
  async videos(t: Tokens): Promise<VideoRede[]> {
    const h = { Authorization: `Bearer ${t.access}` };
    const ch = await json<{ items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] }>(
      await fetch("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true", { headers: h }), "YouTube uploads");
    const lista = ch.items?.[0]?.contentDetails.relatedPlaylists.uploads;
    if (!lista) return [];
    const out: VideoRede[] = [];
    let page = "";
    for (let i = 0; i < 4; i++) {
      const d = await json<{ nextPageToken?: string; items: { contentDetails: { videoId: string; videoPublishedAt?: string }; snippet: { title: string } }[] }>(
        await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${lista}${page ? `&pageToken=${page}` : ""}`, { headers: h }), "YouTube vídeos");
      for (const it of d.items) {
        const id = it.contentDetails.videoId;
        out.push({ idExterno: id, titulo: it.snippet.title, url: `https://www.youtube.com/shorts/${id}`, postadoEm: dataBR(new Date(it.contentDetails.videoPublishedAt ?? Date.now())) });
      }
      if (!d.nextPageToken) break;
      page = d.nextPageToken;
    }
    return out;
  },
  /** views ganhas por vídeo em um dia (YouTube Analytics já entrega por dia) */
  async viewsDoDia(t: Tokens, dia: string): Promise<Map<string, number>> {
    const p = new URLSearchParams({ ids: "channel==MINE", startDate: dia, endDate: dia, metrics: "views", dimensions: "video", sort: "-views", maxResults: "200" });
    const d = await json<{ rows?: [string, number][] }>(
      await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${p}`, { headers: { Authorization: `Bearer ${t.access}` } }), "YouTube Analytics");
    return new Map((d.rows ?? []).map(([v, n]) => [v, Number(n)]));
  },
  /** título e data real de postagem de vídeos pelo id (até 50 por pedido) */
  async detalhes(t: Tokens, ids: string[]): Promise<Map<string, { titulo: string; postadoEm: string }>> {
    const out = new Map<string, { titulo: string; postadoEm: string }>();
    for (let i = 0; i < ids.length; i += 50) {
      const d = await json<{ items?: { id: string; snippet: { title: string; publishedAt: string } }[] }>(
        await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids.slice(i, i + 50).join(",")}`, { headers: { Authorization: `Bearer ${t.access}` } }), "YouTube detalhes");
      for (const v of d.items ?? []) out.set(v.id, { titulo: v.snippet.title, postadoEm: dataBR(new Date(v.snippet.publishedAt)) });
    }
    return out;
  },
  /** total de views do canal por dia (o mesmo número do YouTube Studio) */
  async totalPorDia(t: Tokens, de: string, ate: string): Promise<Map<string, number>> {
    const p = new URLSearchParams({ ids: "channel==MINE", startDate: de, endDate: ate, metrics: "views", dimensions: "day", sort: "day" });
    const d = await json<{ rows?: [string, number][] }>(
      await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${p}`, { headers: { Authorization: `Bearer ${t.access}` } }), "YouTube Analytics (total)");
    return new Map((d.rows ?? []).map(([dia, n]) => [dia, Number(n)]));
  },
};

/* ======================= TikTok ======================= */
const tk = {
  autorizar(redirect: string, state: string) {
    const p = new URLSearchParams({ client_key: env("TIKTOK_CLIENT_KEY"), scope: "user.info.basic,video.list", response_type: "code", redirect_uri: redirect, state, disable_auto_auth: "1" });
    return `https://www.tiktok.com/v2/auth/authorize/?${p}`;
  },
  async token(body: Record<string, string>): Promise<Tokens> {
    const d = await json<{ access_token: string; refresh_token: string; expires_in: number; error?: string; error_description?: string }>(
      await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: env("TIKTOK_CLIENT_KEY"), client_secret: env("TIKTOK_CLIENT_SECRET"), ...body }) }),
      "TikTok token",
    );
    if (d.error) throw new Error(`TikTok: ${d.error_description || d.error}`);
    return { access: d.access_token, refresh: d.refresh_token, expiraEm: expira(d.expires_in) };
  },
  trocar(code: string, redirect: string) { return tk.token({ code, grant_type: "authorization_code", redirect_uri: redirect }); },
  renovar(t: Tokens) {
    if (!t.refresh) throw new Error("Sem refresh token do TikTok: o criador precisa conectar de novo.");
    return tk.token({ grant_type: "refresh_token", refresh_token: t.refresh });
  },
  async perfil(t: Tokens): Promise<Perfil> {
    const d = await json<{ data: { user: { open_id: string; display_name: string; avatar_url?: string } } }>(
      await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", { headers: { Authorization: `Bearer ${t.access}` } }), "TikTok perfil");
    return { contaExternaId: d.data.user.open_id, nome: d.data.user.display_name, foto: d.data.user.avatar_url ?? null };
  },
  async videos(t: Tokens): Promise<VideoRede[]> {
    const out: VideoRede[] = [];
    let cursor: number | undefined;
    for (let i = 0; i < 10; i++) {
      // o TikTok limita quantos pedidos dá para fazer por minuto (erro 429): espera e tenta de novo
      let r: Response | null = null;
      for (const espera of [0, 3000, 8000, 20000]) {
        if (espera) await new Promise((ok) => setTimeout(ok, espera));
        r = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,view_count", {
          method: "POST", headers: { Authorization: `Bearer ${t.access}`, "Content-Type": "application/json" }, body: JSON.stringify(cursor ? { max_count: 20, cursor } : { max_count: 20 }),
        });
        if (r.status !== 429) break;
      }
      if (r!.status === 429) throw new Error("O TikTok limitou os pedidos por agora (muitas consultas seguidas). Nada se perde: a próxima coleta busca as views de novo.");
      const d = await json<{ data: { videos: { id: string; title?: string; video_description?: string; create_time: number; share_url?: string; view_count?: number }[]; cursor: number; has_more: boolean } }>(r!, "TikTok vídeos");
      if (i) await new Promise((ok) => setTimeout(ok, 400)); // um respiro entre as páginas
      for (const v of d.data.videos) out.push({ idExterno: v.id, titulo: (v.title || v.video_description || "Vídeo do TikTok").slice(0, 140), url: v.share_url ?? null, postadoEm: dataBR(new Date(v.create_time * 1000)), viewsTotal: v.view_count ?? 0 });
      if (!d.data.has_more) break;
      cursor = d.data.cursor;
    }
    return out;
  },
};

/* ======================= Instagram ======================= */
const IG = "https://graph.instagram.com";
const ig = {
  autorizar(redirect: string, state: string) {
    const p = new URLSearchParams({ client_id: env("INSTAGRAM_APP_ID"), redirect_uri: redirect, response_type: "code", scope: "instagram_business_basic,instagram_business_manage_insights", state });
    return `https://www.instagram.com/oauth/authorize?${p}`;
  },
  async trocar(code: string, redirect: string): Promise<Tokens> {
    const curto = await json<{ access_token: string }>(
      await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: new URLSearchParams({ client_id: env("INSTAGRAM_APP_ID"), client_secret: env("INSTAGRAM_APP_SECRET"), grant_type: "authorization_code", redirect_uri: redirect, code }) }),
      "Instagram token");
    // troca pelo token de 60 dias
    const longo = await json<{ access_token: string; expires_in: number }>(
      await fetch(`${IG}/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(env("INSTAGRAM_APP_SECRET"))}&access_token=${encodeURIComponent(curto.access_token)}`), "Instagram token longo");
    return { access: longo.access_token, refresh: null, expiraEm: expira(longo.expires_in) };
  },
  async renovar(t: Tokens): Promise<Tokens> {
    const d = await json<{ access_token: string; expires_in: number }>(
      await fetch(`${IG}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t.access)}`), "Instagram renovar");
    return { access: d.access_token, refresh: null, expiraEm: expira(d.expires_in) };
  },
  async perfil(t: Tokens): Promise<Perfil> {
    const d = await json<{ user_id?: string; id: string; username: string; profile_picture_url?: string }>(
      await fetch(`${IG}/me?fields=user_id,username,profile_picture_url&access_token=${encodeURIComponent(t.access)}`), "Instagram perfil");
    return { contaExternaId: d.user_id ?? d.id, nome: `@${d.username}`, foto: d.profile_picture_url ?? null };
  },
  async videos(t: Tokens): Promise<VideoRede[]> {
    const out: VideoRede[] = [];
    let url = `${IG}/me/media?fields=id,caption,media_type,media_product_type,permalink,timestamp&limit=50&access_token=${encodeURIComponent(t.access)}`;
    for (let i = 0; i < 4 && url; i++) {
      const d = await json<{ data: { id: string; caption?: string; media_type: string; media_product_type?: string; permalink?: string; timestamp: string }[]; paging?: { next?: string } }>(await fetch(url), "Instagram mídias");
      for (const m of d.data) {
        if (m.media_type !== "VIDEO" && m.media_product_type !== "REELS") continue;
        out.push({ idExterno: m.id, titulo: (m.caption || "Reels do Instagram").split("\n")[0].slice(0, 140), url: m.permalink ?? null, postadoEm: dataBR(new Date(m.timestamp)) });
      }
      url = d.paging?.next ?? "";
    }
    // total de views de cada reels (só os 60 mais recentes, para não estourar o limite da API)
    for (const v of out.slice(0, 60)) {
      try {
        const d = await json<{ data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(
          await fetch(`${IG}/${v.idExterno}/insights?metric=views&access_token=${encodeURIComponent(t.access)}`), "Instagram insights");
        const m = d.data.find((x) => x.name === "views");
        v.viewsTotal = m?.total_value?.value ?? m?.values?.[0]?.value ?? 0;
      } catch {
        v.viewsTotal = undefined; // sem insights para esse vídeo: não mexe no total
      }
    }
    return out.filter((v) => v.viewsTotal !== undefined);
  },
};

/** Views da conta inteira do Instagram em um dia (Brasília), sem contar stories. */
async function igViewsDoDia(t: Tokens, dia: string): Promise<number> {
  const ini = Math.floor(new Date(`${dia}T03:00:00Z`).getTime() / 1000); // 00:00 em Brasília
  type R = { data: { name: string; total_value?: { value?: number; breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[] } }[] };
  const pedir = (extra: Record<string, string>) =>
    fetch(`${IG}/me/insights?${new URLSearchParams({ metric: "views", period: "day", metric_type: "total_value", since: String(ini), until: String(ini + 86_400), access_token: t.access, ...extra })}`).then((r) => json<R>(r, "Instagram views da conta"));
  // com a divisão por tipo (para tirar os stories); se o Instagram não aceitar, pede só o total
  const d = await pedir({ breakdown: "media_product_type" }).catch(() => pedir({}));
  const tv = d.data.find((x) => x.name === "views")?.total_value;
  const partes = tv?.breakdowns?.[0]?.results;
  if (partes?.length) return partes.filter((r) => !r.dimension_values.includes("STORY")).reduce((a, r) => a + Number(r.value), 0);
  return Number(tv?.value ?? 0);
}
Object.assign(ig, { viewsDoDia: igViewsDoDia });

export const REDE = { youtube: yt, tiktok: tk, instagram: ig as typeof ig & { viewsDoDia: typeof igViewsDoDia } } as const;
export const NOME_REDE: Record<Rede, string> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };
