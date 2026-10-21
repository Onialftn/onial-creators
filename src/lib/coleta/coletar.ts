import "server-only";
import { hojeBrasil, intervalo, mesAnterior, mesDe, primeiroDia, somarDias } from "@/lib/datas";
import { supabaseAdmin } from "@/lib/supabase/server";
import { OUTROS_VIDEOS } from "@/lib/dados";
import { viewsGanhas } from "./ganho";
import { REDE, type Rede, type Tokens } from "./redes";

type Admin = ReturnType<typeof supabaseAdmin>;

async function tokensValidos(admin: Admin, contaId: string, rede: Rede): Promise<Tokens> {
  const { data: t } = await admin.from("tokens_plataforma").select("access_token, refresh_token, expira_em").eq("conta_id", contaId).single();
  if (!t?.access_token) throw new Error("Conta sem autorização: conecte de novo.");
  let tokens: Tokens = { access: t.access_token, refresh: t.refresh_token, expiraEm: t.expira_em ? new Date(t.expira_em) : null };
  // Instagram: token de 60 dias, renovado quando faltam menos de 10; os outros: quando faltam menos de 5 minutos
  const margem = rede === "instagram" ? 10 * 86_400_000 : 5 * 60_000;
  if (tokens.expiraEm && tokens.expiraEm.getTime() - Date.now() < margem) {
    tokens = await REDE[rede].renovar(tokens);
    await admin.from("tokens_plataforma").update({ access_token: tokens.access, refresh_token: tokens.refresh, expira_em: tokens.expiraEm?.toISOString() ?? null }).eq("conta_id", contaId);
  }
  return tokens;
}

/** Busca os vídeos e as views de uma conta conectada e grava as views ganhas por dia. */
/** completo = busca desde o 1º dia do mês passado (ao conectar e no botão do gestor). */
export async function coletarConta(contaId: string, completo = false) {
  const admin = supabaseAdmin();
  const { data: conta } = await admin.from("contas_plataforma").select("id, criador_id, plataforma").eq("id", contaId).single();
  if (!conta) throw new Error("Conta não encontrada");
  const rede = conta.plataforma as Rede;
  const criador = conta.criador_id as string;
  const hoje = hojeBrasil();
  const ontem = somarDias(hoje, -1);

  try {
    const tokens = await tokensValidos(admin, contaId, rede);
    const videos = await REDE[rede].videos(tokens);

    // vídeos que já temos
    const { data: existentes } = await admin.from("videos").select("id, id_externo, views_total, views_total_em").eq("criador_id", criador).eq("plataforma", rede);
    const porExterno = new Map((existentes ?? []).map((v) => [v.id_externo as string, v]));
    const novos = videos.filter((v) => !porExterno.has(v.idExterno));
    if (novos.length) {
      const { data: inseridos } = await admin
        .from("videos")
        .insert(novos.map((v) => ({ criador_id: criador, plataforma: rede, id_externo: v.idExterno, titulo: v.titulo, url: v.url, postado_em: v.postadoEm })))
        .select("id, id_externo, views_total, views_total_em");
      for (const v of inseridos ?? []) porExterno.set(v.id_externo as string, { ...v, views_total_em: null });
    }

    let linhas = 0;
    if (rede === "youtube") {
      // O YouTube Analytics entrega as views por dia, com 1 a 3 dias de atraso: relê sempre os últimos 4 dias.
      // Ao conectar, no botão do gestor ou na primeira coleta, busca desde o 1º dia do mês passado;
      // se ficou dias sem coletar, recupera desde o último dia gravado.
      const { data: ultimo } = await admin.from("views_diarias").select("dia").eq("criador_id", criador).eq("plataforma", rede).order("dia", { ascending: false }).limit(1).maybeSingle();
      const padrao = somarDias(hoje, -4);
      const inicio = ultimo && !completo ? [somarDias(String(ultimo.dia), -3), padrao].sort()[0] : primeiroDia(mesAnterior(mesDe(hoje)));
      const dias = intervalo(inicio, ontem);
      // 6 dias por vez, para ser rápido sem estourar o limite da API
      const mapas: Map<string, number>[] = [];
      for (let i = 0; i < dias.length; i += 6) mapas.push(...(await Promise.all(dias.slice(i, i + 6).map((d) => REDE.youtube.viewsDoDia(tokens, d)))));
      // A lista por vídeo só traz os 200 mais vistos do dia; o resto do total do canal vai para "Outros vídeos do canal".
      const outros = `${OUTROS_VIDEOS}${criador}`; // id único por criador (vídeos têm id_externo único por rede)
      const totais = dias.length ? await REDE.youtube.totalPorDia(tokens, dias[0], dias[dias.length - 1]) : new Map<string, number>();
      for (let i = 0; i < dias.length; i++) {
        const dia = dias[i];
        const mapa = mapas[i];
        const resto = (totais.get(dia) ?? 0) - [...mapa.values()].reduce((a, b) => a + b, 0);
        if (resto > 0) mapa.set(outros, resto);
        const faltando = [...mapa.keys()].filter((id) => !porExterno.has(id));
        if (faltando.length) {
          const { data: ins } = await admin
            .from("videos")
            .insert(faltando.map((id) => id === outros
              ? { criador_id: criador, plataforma: rede, id_externo: id, titulo: "Outros vídeos do canal", url: null, postado_em: dias[0] }
              : { criador_id: criador, plataforma: rede, id_externo: id, titulo: "Vídeo do YouTube", url: `https://www.youtube.com/watch?v=${id}`, postado_em: dia }))
            .select("id, id_externo, views_total, views_total_em");
          for (const v of ins ?? []) porExterno.set(v.id_externo as string, v);
        }
        const rows = [...mapa.entries()].map(([id, views]) => ({ video_id: porExterno.get(id)!.id, dia, criador_id: criador, plataforma: rede, views }));
        if (rows.length) await admin.from("views_diarias").upsert(rows);
        linhas += rows.length;
      }
    } else {
      // TikTok e Instagram: só o total. O ganho desde a última coleta vai para o dia de ontem.
      const { data: jaGravado } = await admin.from("views_diarias").select("video_id, views").eq("criador_id", criador).eq("plataforma", rede).eq("dia", ontem);
      const deOntem = new Map((jaGravado ?? []).map((r) => [r.video_id as string, Number(r.views)]));
      for (const v of videos) {
        const reg = porExterno.get(v.idExterno);
        if (!reg || v.viewsTotal === undefined) continue;
        const anterior = reg.views_total_em ? Number(reg.views_total) : null;
        const ganho = viewsGanhas(anterior, v.viewsTotal, v.postadoEm, ontem);
        if (ganho > 0) {
          await admin.from("views_diarias").upsert({ video_id: reg.id, dia: ontem, criador_id: criador, plataforma: rede, views: (deOntem.get(reg.id) ?? 0) + ganho });
          linhas++;
        }
        await admin.from("videos").update({ views_total: v.viewsTotal, views_total_em: new Date().toISOString(), titulo: v.titulo, url: v.url }).eq("id", reg.id);
      }
    }

    await admin.from("contas_plataforma").update({ ultima_coleta: new Date().toISOString(), erro: null }).eq("id", contaId);
    return { rede, videos: videos.length, linhas };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("contas_plataforma").update({ erro: msg.slice(0, 500) }).eq("id", contaId);
    throw e;
  }
}

/** Coleta todas as contas conectadas (uma de cada vez). */
export async function coletarTodas(completo = false) {
  const admin = supabaseAdmin();
  const { data: contas } = await admin.from("contas_plataforma").select("id");
  const resultado: { conta: string; ok: boolean; detalhe: string }[] = [];
  for (const c of contas ?? []) {
    try {
      const r = await coletarConta(c.id, completo);
      resultado.push({ conta: c.id, ok: true, detalhe: `${r.rede}: ${r.videos} vídeos, ${r.linhas} registros` });
    } catch (e) {
      resultado.push({ conta: c.id, ok: false, detalhe: e instanceof Error ? e.message : String(e) });
    }
  }
  return resultado;
}
