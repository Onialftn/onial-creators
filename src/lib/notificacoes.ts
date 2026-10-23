import "server-only";
import webpush from "web-push";
import { marcoMeta, videosBombando, type VideoSemana } from "@/lib/avisos";
import { rankingDoMes, resumoDoMes } from "@/lib/dados";
import { hojeBrasil, mesDe, nomeMes, somarDias } from "@/lib/datas";
import { MAPAS } from "@/lib/ia/mapas";
import { formatarNumero, formatarReais, inicioDaSemana } from "@/lib/pagamento";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface Aviso { tipo: string; titulo: string; texto?: string; link?: string; chave: string }
type Admin = ReturnType<typeof supabaseAdmin>;
const NOME_REDE: Record<string, string> = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram" };

export function pushConfigurado() {
  return !!(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

/** Manda o aviso para os celulares/navegadores inscritos do criador. */
async function enviarPush(admin: Admin, criadorId: string, a: Aviso) {
  if (!pushConfigurado()) return;
  webpush.setVapidDetails("mailto:onial.contato@gmail.com", process.env.VAPID_PUBLIC_KEY!.trim(), process.env.VAPID_PRIVATE_KEY!.trim());
  const { data: subs } = await admin.from("push_inscricoes").select("endpoint, p256dh, auth").eq("criador_id", criadorId);
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ titulo: a.titulo, texto: a.texto ?? "", link: a.link ?? "/" }), { TTL: 86_400 });
    } catch (e) {
      const st = (e as { statusCode?: number }).statusCode;
      if (st === 404 || st === 410) await admin.from("push_inscricoes").delete().eq("endpoint", s.endpoint); // inscrição vencida
    }
  }));
}

/** Cria o aviso (se ainda não existir com a mesma chave) e manda para o celular. */
export async function notificar(criadorId: string, a: Aviso, admin: Admin = supabaseAdmin()) {
  const { data } = await admin
    .from("notificacoes")
    .upsert({ criador_id: criadorId, tipo: a.tipo, titulo: a.titulo, texto: a.texto ?? "", link: a.link ?? null, chave: a.chave }, { onConflict: "criador_id,chave", ignoreDuplicates: true })
    .select("id");
  if (data?.length) await enviarPush(admin, criadorId, a).catch(() => undefined);
}

/** Views da última semana de cada vídeo do criador (sem os registros de "outros" e lançamentos à mão). */
async function semanaPorVideo(admin: Admin, criadorId: string, hoje: string): Promise<VideoSemana[]> {
  const soma = new Map<string, number>();
  for (let de = 0; de < 20_000; de += 1000) {
    const { data } = await admin.from("views_diarias").select("video_id, views").eq("criador_id", criadorId).gte("dia", somarDias(hoje, -7)).range(de, de + 999);
    for (const r of data ?? []) soma.set(r.video_id as string, (soma.get(r.video_id as string) ?? 0) + Number(r.views));
    if (!data || data.length < 1000) break;
  }
  const ids = [...soma.keys()];
  const out: VideoSemana[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin.from("videos").select("id, titulo, plataforma, id_externo").in("id", ids.slice(i, i + 200));
    for (const v of data ?? []) {
      const ext = String(v.id_externo ?? "");
      if (!ext || ext.startsWith("__outros__") || ext.startsWith("http")) continue;
      out.push({ id: v.id as string, titulo: String(v.titulo), plataforma: String(v.plataforma), views: soma.get(v.id as string) ?? 0 });
    }
  }
  return out;
}

/** Gera os avisos do dia de todos os criadores. Roda depois da coleta das 6h. */
export async function gerarNotificacoes() {
  const admin = supabaseAdmin();
  const sb = admin as unknown as Parameters<typeof resumoDoMes>[0];
  const hoje = hojeBrasil();
  const mes = mesDe(hoje);
  const semana = inicioDaSemana(hoje);
  const { data: criadores } = await admin.from("perfis").select("id, nome").eq("papel", "criador");
  const ranking = await rankingDoMes(sb, mes);
  const { data: mapas } = await admin.from("mapa_semana").select("criador_id, mapa").eq("semana", semana);
  let n = 0;

  for (const c of criadores ?? []) {
    const id = c.id as string;
    const avisar = async (a: Aviso) => { await notificar(id, a, admin); n++; };
    try {
      const r = await resumoDoMes(sb, id, mes);
      const hojeCal = r.calendario.find((d) => d.data === hoje);

      // 1. dia de postar + mapa da semana
      if (hojeCal?.status === "hoje") {
        const mapa = MAPAS.find((m) => m.id === mapas?.find((x) => x.criador_id === id)?.mapa);
        await avisar({
          tipo: "postar",
          titulo: mapa ? `Hoje é dia de postar no ${mapa.nome} ${mapa.emoji}` : "Hoje é dia de postar 🎬",
          texto: mapa ? "Esse é o mapa da sua semana. Veja os vídeos em alta em Ideias de vídeos." : "Veja os vídeos em alta em Ideias de vídeos para se inspirar.",
          link: mapa ? `/ideias?mapa=${mapa.id}` : "/ideias",
          chave: `postar:${hoje}`,
        });
      }
      // 2. constância: dia para repor e faltas
      if (r.aRepor > 0)
        await avisar({ tipo: "constancia", titulo: `Você tem ${r.aRepor} ${r.aRepor === 1 ? "dia" : "dias"} para repor até domingo`, texto: "Poste um vídeo extra esta semana para não perder o bônus de constância.", link: "/dias", chave: `repor:${hoje}` });
      if (r.faltas > 0)
        await avisar({ tipo: "constancia", titulo: r.faltas === 1 ? "Você teve 1 falta no mês" : `Você teve ${r.faltas} faltas no mês`, texto: r.faltas === 1 ? "O bônus de constância caiu para 5%. Com mais uma falta ele zera." : "O bônus de constância deste mês zerou.", link: "/dias", chave: `faltas:${mes}:${r.faltas}` });

      // 3. meta
      const marco = marcoMeta(r.views, r.meta);
      if (marco && r.meta)
        await avisar(marco === 100
          ? { tipo: "meta", titulo: "Meta batida! 🏆", texto: `Você passou de ${formatarNumero(r.meta)} views e garantiu o bônus de ${formatarReais(Math.round(r.meta / 10))}.`, link: "/metas", chave: `meta:${mes}:100` }
          : { tipo: "meta", titulo: `Você chegou a ${marco}% da meta`, texto: `Faltam ${formatarNumero(r.meta - r.views)} views para o bônus de ${formatarReais(Math.round(r.meta / 10))}.`, link: "/metas", chave: `meta:${mes}:${marco}` });

      // 4. vídeo bombando (2× a média do criador)
      for (const v of videosBombando(await semanaPorVideo(admin, id, hoje)))
        await avisar({ tipo: "video", titulo: `Parabéns! Seu vídeo está bombando no ${NOME_REDE[v.plataforma] ?? v.plataforma} 🔥`, texto: `"${v.titulo.slice(0, 80)}" fez ${formatarNumero(v.views)} views na última semana, ${String(v.vezes).replace(".", ",")}× a sua média.`, link: "/metas", chave: `bomba:${v.id}` });

      // 5. ranking: subiu de posição desde a última anotação
      if (ranking.length > 1) {
        const pos = ranking.findIndex((l) => l.criadorId === id) + 1;
        const { data: antes } = await admin.from("saldos_diarios").select("posicao").eq("criador_id", id).lt("dia", hoje).not("posicao", "is", null).order("dia", { ascending: false }).limit(1).maybeSingle();
        if (pos > 0 && antes?.posicao && pos < Number(antes.posicao))
          await avisar({ tipo: "ranking", titulo: pos === 1 ? "Você está em 1º no ranking! 👑" : `Você subiu para o ${pos}º lugar no ranking`, texto: `Ranking de ${nomeMes(mes).toLowerCase()}, por views.`, link: "/ranking", chave: `ranking:${hoje}:${pos}` });
        if (pos > 0) await admin.from("saldos_diarios").update({ posicao: pos }).eq("criador_id", id).eq("dia", hoje);
      }
    } catch (e) {
      console.error("notificações", id, e);
    }
  }
  return n;
}
