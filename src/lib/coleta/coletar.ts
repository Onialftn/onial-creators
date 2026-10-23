import "server-only";
import { hojeBrasil, intervalo, mesAnterior, mesDe, primeiroDia, somarDias } from "@/lib/datas";
import { supabaseAdmin } from "@/lib/supabase/server";
import { OUTROS_VIDEOS } from "@/lib/dados";
import { viewsGanhas } from "./ganho";
import { REDE, type Rede, type Tokens } from "./redes";

type Admin = ReturnType<typeof supabaseAdmin>;

export async function tokensValidos(admin: Admin, contaId: string, rede: Rede): Promise<Tokens> {
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
    const outros = `${OUTROS_VIDEOS}${criador}`; // registro "Outros vídeos" (id único por criador)
    async function idOutros(postado: string) {
      if (!porExterno.has(outros)) {
        const { data: v } = await admin.from("videos").insert({ criador_id: criador, plataforma: rede, id_externo: outros, titulo: rede === "instagram" ? "Outros conteúdos do perfil" : "Outros vídeos do canal", url: null, postado_em: postado }).select("id, id_externo, views_total, views_total_em").single();
        if (v) porExterno.set(outros, v);
      }
      return porExterno.get(outros)?.id as string | undefined;
    }
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
      const totais = dias.length ? await REDE.youtube.totalPorDia(tokens, dias[0], dias[dias.length - 1]) : new Map<string, number>();

      // Histórico do ano (aba Metas de views): antes disso, só o total do canal por dia, desde 1º de janeiro.
      // Preenche apenas os dias anteriores ao primeiro dia já gravado, para nunca contar duas vezes.
      if (completo) {
        const { data: primeiro } = await admin.from("views_diarias").select("dia").eq("criador_id", criador).eq("plataforma", rede).order("dia").limit(1).maybeSingle();
        const limite = [primeiro ? String(primeiro.dia) : inicio, inicio].sort()[0];
        const janeiro = `${hoje.slice(0, 4)}-01-01`;
        if (janeiro < limite) {
          const antigos = await REDE.youtube.totalPorDia(tokens, janeiro, somarDias(limite, -1));
          if (antigos.size) {
            const id = await idOutros(janeiro);
            const rows = [...antigos.entries()].filter(([, n]) => n > 0).map(([dia, views]) => ({ video_id: id, dia, criador_id: criador, plataforma: rede, views }));
            if (id && rows.length) await admin.from("views_diarias").upsert(rows);
            linhas += rows.length;
          }
        }
      }
      // vídeos com views que não estão entre os 200 mais recentes: busca título e data real de postagem
      const semCadastro = [...new Set(mapas.flatMap((m) => [...m.keys()]))].filter((id) => !porExterno.has(id));
      const { data: genericos } = await admin.from("videos").select("id, id_externo").eq("criador_id", criador).eq("plataforma", rede).eq("titulo", "Vídeo do YouTube").limit(200);
      const info = await REDE.youtube.detalhes(tokens, [...semCadastro, ...(genericos ?? []).map((g) => String(g.id_externo))]).catch(() => new Map<string, { titulo: string; postadoEm: string }>());
      for (const g of genericos ?? []) {
        const d = info.get(String(g.id_externo));
        if (d) await admin.from("videos").update({ titulo: d.titulo, postado_em: d.postadoEm }).eq("id", g.id);
      }
      if (semCadastro.length) {
        const primeiroDia = new Map<string, string>();
        mapas.forEach((m, i) => m.forEach((_, id) => { if (!primeiroDia.has(id)) primeiroDia.set(id, dias[i]); }));
        const { data: ins } = await admin
          .from("videos")
          .insert(semCadastro.map((id) => ({ criador_id: criador, plataforma: rede, id_externo: id, titulo: info.get(id)?.titulo ?? "Vídeo do YouTube", url: `https://www.youtube.com/shorts/${id}`, postado_em: info.get(id)?.postadoEm ?? primeiroDia.get(id)! })))
          .select("id, id_externo, views_total, views_total_em");
        for (const v of ins ?? []) porExterno.set(v.id_externo as string, v);
      }
      for (let i = 0; i < dias.length; i++) {
        const dia = dias[i];
        const mapa = mapas[i];
        const resto = (totais.get(dia) ?? 0) - [...mapa.values()].reduce((a, b) => a + b, 0);
        if (resto > 0) { await idOutros(dias[0]); mapa.set(outros, resto); }
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

      if (rede === "instagram") {
        // O Instagram também informa as views da conta inteira por dia. Com isso:
        // - dias sem nada gravado (antes de conectar) recebem o total do dia em "Outros conteúdos";
        // - ontem: o que o total da conta tiver a mais que a soma dos reels vai para "Outros conteúdos".
        const inicio = primeiroDia(mesAnterior(mesDe(hoje)));
        const { data: gravados } = await admin.from("views_diarias").select("dia, video_id, views").eq("criador_id", criador).eq("plataforma", rede).gte("dia", inicio).lte("dia", ontem).limit(5000);
        const idO = porExterno.get(outros)?.id;
        const somaReels = new Map<string, number>();
        const temDia = new Set<string>();
        for (const g of gravados ?? []) {
          temDia.add(String(g.dia));
          if (g.video_id !== idO) somaReels.set(String(g.dia), (somaReels.get(String(g.dia)) ?? 0) + Number(g.views));
        }
        const dias = intervalo(inicio, ontem).filter((d) => d === ontem || (completo && !temDia.has(d)) || (!completo && d >= somarDias(ontem, -3) && !temDia.has(d)));
        const totais: number[] = [];
        let falhaIg: string | undefined;
        for (let i = 0; i < dias.length; i += 6) totais.push(...(await Promise.all(dias.slice(i, i + 6).map((d) => REDE.instagram.viewsDoDia(tokens, d).catch((e) => { falhaIg ??= e instanceof Error ? e.message : String(e); return -1; })))));
        if (dias.length && totais.every((n) => n < 0)) throw new Error(`Views da conta do Instagram: ${falhaIg}`);
        const rows: { video_id: string; dia: string; criador_id: string; plataforma: Rede; views: number }[] = [];
        for (let i = 0; i < dias.length; i++) {
          const resto = totais[i] - (somaReels.get(dias[i]) ?? 0);
          if (totais[i] < 0 || resto <= 0) continue;
          const id = await idOutros(inicio);
          if (id) rows.push({ video_id: id, dia: dias[i], criador_id: criador, plataforma: rede, views: resto });
        }
        if (rows.length) await admin.from("views_diarias").upsert(rows);
        linhas += rows.length;
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
