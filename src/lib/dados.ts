import "server-only";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";
import { BONUS_META_CENTAVOS_POR_MIL, calcularConstancia, calcularPagamento, fimDaSemana as fimDaSemanaDe, inicioDaSemana as inicioDaSemanaDe, type DiaPostagem } from "@/lib/pagamento";
import { diaDaSemana, hojeBrasil, intervalo, mesDe, primeiroDia, ultimoDia } from "@/lib/datas";

export type Plataforma = "tiktok" | "youtube" | "instagram";
export const PLATAFORMAS: Plataforma[] = ["tiktok", "youtube", "instagram"];

export interface Perfil {
  id: string;
  nome: string;
  papel: "criador" | "gestor";
  foto_url: string | null;
  canal_youtube: string | null;
}

/** Quem está logado. Sem sessão, volta para o login. */
export async function usuarioAtual() {
  const sb = await supabaseServidor();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await sb.from("perfis").select("id, nome, papel, foto_url, canal_youtube").eq("id", user.id).single();
  if (!perfil) redirect("/login");
  return { sb, user, perfil: perfil as Perfil };
}

export type StatusDia = "postado" | "reposto" | "nao_postado" | "a_repor" | "folga" | "hoje" | "a_postar";
export interface DiaCalendario {
  data: string;
  status: StatusDia;
  postagens: number;
}

export interface ResumoMes {
  mes: string;
  hoje: string;
  views: number;
  viewsPorPlataforma: Record<Plataforma, number>;
  meta: number | null;
  faltas: number;
  aRepor: number;
  diasAgendados: number;
  diasCumpridos: number;
  calendario: DiaCalendario[];
  pagamento: ReturnType<typeof calcularPagamento>;
  /** total se as views chegarem à meta */
  totalSeBaterMeta: number | null;
}

type SB = Awaited<ReturnType<typeof supabaseServidor>>;

/** Tudo o que a dashboard e as abas precisam de um criador num mês. */
export async function resumoDoMes(sb: SB, criadorId: string, mes: string): Promise<ResumoMes> {
  const hoje = hojeBrasil();
  const ini = primeiroDia(mes);
  const fim = ultimoDia(mes);
  const semIni = inicioDaSemanaDe(ini);
  const semFim = fimDaSemanaDe(fim);

  const [views, meta, agenda, dias] = await Promise.all([
    // soma pronta no banco (a leitura direta de views_diarias corta em 1.000 linhas)
    sb.from("ranking_mensal").select("plataforma, views").eq("criador_id", criadorId).eq("mes", mes),
    sb.from("metas").select("meta_views").eq("criador_id", criadorId).eq("mes", mes).maybeSingle(),
    sb.from("agenda_postagem").select("dia_semana").eq("criador_id", criadorId),
    sb.from("dias_postagem").select("dia, postagens").eq("criador_id", criadorId).gte("dia", semIni).lte("dia", semFim),
  ]);

  const viewsPorPlataforma: Record<Plataforma, number> = { tiktok: 0, youtube: 0, instagram: 0 };
  for (const r of views.data ?? []) viewsPorPlataforma[r.plataforma as Plataforma] += Number(r.views);
  const total = viewsPorPlataforma.tiktok + viewsPorPlataforma.youtube + viewsPorPlataforma.instagram;

  const agendados = new Set((agenda.data ?? []).map((r) => r.dia_semana as number));
  const postagens = new Map((dias.data ?? []).map((r) => [r.dia as string, r.postagens as number]));
  const lista: DiaPostagem[] = intervalo(semIni, semFim).map((data) => ({
    data,
    agendado: agendados.has(diaDaSemana(data)),
    postagens: postagens.get(data) ?? 0,
  }));
  const constancia = calcularConstancia(lista, hoje, mes);

  // reposições: em cada semana, postagens extras cobrem os dias perdidos, do mais antigo ao mais novo
  const extrasPorSemana = new Map<string, number>();
  for (const d of lista) {
    const k = inicioDaSemanaDe(d.data);
    extrasPorSemana.set(k, (extrasPorSemana.get(k) ?? 0) + Math.max(0, d.postagens - (d.agendado ? 1 : 0)));
  }
  const statusDe = new Map<string, StatusDia>();
  for (const d of lista) {
    let status: StatusDia;
    if (!d.agendado) status = d.postagens > 0 ? "postado" : "folga";
    else if (d.postagens > 0) status = "postado";
    else if (d.data === hoje) status = "hoje";
    else if (d.data > hoje) status = "a_postar";
    else {
      const k = inicioDaSemanaDe(d.data);
      const extras = extrasPorSemana.get(k) ?? 0;
      if (extras > 0) {
        extrasPorSemana.set(k, extras - 1);
        status = "reposto";
      } else status = fimDaSemanaDe(d.data) < hoje ? "nao_postado" : "a_repor";
    }
    statusDe.set(d.data, status);
  }
  const calendario: DiaCalendario[] = intervalo(ini, fim).map((data) => ({
    data,
    status: statusDe.get(data)!,
    postagens: postagens.get(data) ?? 0,
  }));

  const doMes = lista.filter((d) => d.data >= ini && d.data <= fim && d.agendado);
  const diasCumpridos = doMes.filter((d) => { const st = statusDe.get(d.data); return st === "postado" || st === "reposto"; }).length;
  const metaViews = meta.data ? Number(meta.data.meta_views) : null;
  const pagamento = calcularPagamento(total, metaViews, constancia.faltas);
  const totalSeBaterMeta = metaViews
    ? pagamento.brutoCentavos + pagamento.constanciaCentavos + Math.round((metaViews * BONUS_META_CENTAVOS_POR_MIL) / 1000)
    : null;

  return {
    mes,
    hoje,
    views: total,
    viewsPorPlataforma,
    meta: metaViews,
    faltas: constancia.faltas,
    aRepor: constancia.aRepor,
    diasAgendados: doMes.length,
    diasCumpridos,
    calendario,
    pagamento,
    totalSeBaterMeta,
  };
}

export interface LinhaRanking {
  criadorId: string;
  nome: string;
  foto: string | null;
  views: number;
  porPlataforma: Record<Plataforma, number>;
}

/** Ranking do mês: só views. */
export async function rankingDoMes(sb: SB, mes: string): Promise<LinhaRanking[]> {
  const { data } = await sb.from("ranking_mensal").select("criador_id, nome, foto_url, plataforma, views").eq("mes", mes);
  const mapa = new Map<string, LinhaRanking>();
  for (const r of data ?? []) {
    const id = r.criador_id as string;
    if (!mapa.has(id)) mapa.set(id, { criadorId: id, nome: r.nome as string, foto: r.foto_url as string | null, views: 0, porPlataforma: { tiktok: 0, youtube: 0, instagram: 0 } });
    const l = mapa.get(id)!;
    l.porPlataforma[r.plataforma as Plataforma] += Number(r.views);
    l.views += Number(r.views);
  }
  // criadores sem views ainda aparecem com zero
  const { data: perfis } = await sb.from("perfis").select("id, nome, foto_url").eq("papel", "criador");
  for (const p of perfis ?? []) {
    if (!mapa.has(p.id)) mapa.set(p.id, { criadorId: p.id, nome: p.nome, foto: p.foto_url, views: 0, porPlataforma: { tiktok: 0, youtube: 0, instagram: 0 } });
  }
  return [...mapa.values()].sort((a, b) => b.views - a.views);
}

export interface VideoTop {
  id: string;
  /** capa do vídeo (por enquanto só YouTube) */
  capa: string | null;
  titulo: string;
  url: string | null;
  plataforma: Plataforma;
  postado_em: string;
  views: number;
}

/** Vídeos de um criador com mais views ganhas no mês. */
/** id_externo do registro que guarda as views dos vídeos fora do top 200 do dia (YouTube) */
export const OUTROS_VIDEOS = "__outros__";

export async function topVideos(sb: SB, criadorId: string, mes: string, limite = 6): Promise<VideoTop[]> {
  // lê em páginas de 1.000 (limite do banco por consulta)
  const data: unknown[] = [];
  for (let de = 0; ; de += 1000) {
    const { data: pagina } = await sb
      .from("views_diarias")
      .select("video_id, views, videos(titulo, url, plataforma, postado_em, id_externo)")
      .eq("criador_id", criadorId)
      .gte("dia", primeiroDia(mes))
      .lte("dia", ultimoDia(mes))
      .order("dia")
      .order("video_id")
      .range(de, de + 999);
    data.push(...(pagina ?? []));
    if (!pagina || pagina.length < 1000) break;
  }
  const mapa = new Map<string, VideoTop>();
  for (const r of data as { video_id: string; views: number; videos: { titulo: string; url: string | null; plataforma: Plataforma; postado_em: string; id_externo: string | null } | null }[]) {
    if (!r.videos || r.videos.id_externo?.startsWith(OUTROS_VIDEOS)) continue;
    if (!mapa.has(r.video_id)) mapa.set(r.video_id, { id: r.video_id, capa: r.videos.plataforma === "youtube" && r.videos.id_externo ? `https://i.ytimg.com/vi/${r.videos.id_externo}/oardefault.jpg` : null, titulo: r.videos.titulo, url: r.videos.url, plataforma: r.videos.plataforma, postado_em: r.videos.postado_em, views: 0 });
    mapa.get(r.video_id)!.views += Number(r.views);
  }
  return [...mapa.values()].sort((a, b) => b.views - a.views).slice(0, limite);
}

export { mesDe };

/** Quando as views deste criador foram buscadas pela última vez (qualquer rede conectada). */
export async function ultimaColeta(sb: SB, criadorId: string): Promise<string | null> {
  const { data } = await sb.from("contas_plataforma").select("ultima_coleta").eq("criador_id", criadorId).not("ultima_coleta", "is", null).order("ultima_coleta", { ascending: false }).limit(1).maybeSingle();
  return (data?.ultima_coleta as string | undefined) ?? null;
}

export interface MesHistorico { mes: string; por: Record<Plataforma, number>; total: number; meta: number | null }

/** Views de cada mês de um ano (por rede) e a meta de cada mês. */
export async function historicoDoAno(sb: SB, criadorId: string, ano: number): Promise<{ meses: MesHistorico[]; primeiroAno: number }> {
  const [views, metas, primeiro] = await Promise.all([
    sb.from("ranking_mensal").select("mes, plataforma, views").eq("criador_id", criadorId).gte("mes", `${ano}-01`).lte("mes", `${ano}-12`),
    sb.from("metas").select("mes, meta_views").eq("criador_id", criadorId).gte("mes", `${ano}-01`).lte("mes", `${ano}-12`),
    sb.from("ranking_mensal").select("mes").eq("criador_id", criadorId).order("mes").limit(1).maybeSingle(),
  ]);
  const meta = new Map((metas.data ?? []).map((m) => [m.mes as string, Number(m.meta_views)]));
  const meses: MesHistorico[] = Array.from({ length: 12 }, (_, i) => {
    const mes = `${ano}-${String(i + 1).padStart(2, "0")}`;
    return { mes, por: { tiktok: 0, youtube: 0, instagram: 0 }, total: 0, meta: meta.get(mes) ?? null };
  });
  for (const r of views.data ?? []) {
    const m = meses[Number(String(r.mes).slice(5)) - 1];
    m.por[r.plataforma as Plataforma] += Number(r.views);
    m.total += Number(r.views);
  }
  return { meses, primeiroAno: primeiro.data ? Number(String(primeiro.data.mes).slice(0, 4)) : ano };
}
