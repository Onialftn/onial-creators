/**
 * Regras de pagamento da Onial Creators.
 * Não mude sem o gestor pedir (veja CLAUDE.md). Todos os valores em centavos.
 */

/** Um dia do calendário do criador. */
export interface DiaPostagem {
  /** Data no formato AAAA-MM-DD */
  data: string;
  /** Dia marcado pelo gestor como dia de postagem (os outros são folga). */
  agendado: boolean;
  /** Quantos vídeos o criador postou nesse dia. */
  postagens: number;
}

export interface ResultadoConstancia {
  /** Dias de postagem perdidos e não repostos em semanas já encerradas. */
  faltas: number;
  /** Dias perdidos na semana atual que ainda podem ser repostos até domingo. */
  aRepor: number;
  /** 0,10 / 0,05 / 0 */
  percentual: number;
}

export interface ResultadoPagamento {
  views: number;
  meta: number | null;
  bateuMeta: boolean;
  faltas: number;
  percentualConstancia: number;
  brutoCentavos: number;
  constanciaCentavos: number;
  bonusMetaCentavos: number;
  /** quantas gravações o criador ajudou (confirmadas por quem pediu) */
  ajudas: number;
  bonusAjudaCentavos: number;
  /** vídeos extras aprovados pelo gestor (valor de cada extra somado) */
  bonusExtraCentavos: number;
  totalCentavos: number;
}

/** R$ 5 a cada 1.000 views = 0,5 centavo por view. */
export const CENTAVOS_POR_MIL_VIEWS = 500;
/** R$ 1 a cada 1.000 views da meta. */
export const BONUS_META_CENTAVOS_POR_MIL = 100;
/** R$ 25 por gravação em que o criador ajudou (Gravações), qualquer duração. */
export const BONUS_AJUDA_CENTAVOS = 2500;

const DIA_MS = 86_400_000;

function paraUtc(data: string): number {
  const [a, m, d] = data.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Segunda-feira (AAAA-MM-DD) da semana da data. */
export function inicioDaSemana(data: string): string {
  const t = paraUtc(data);
  const diaSemana = new Date(t).getUTCDay(); // 0 = domingo
  const voltar = (diaSemana + 6) % 7;
  return new Date(t - voltar * DIA_MS).toISOString().slice(0, 10);
}

/** Domingo (AAAA-MM-DD) da semana da data. */
export function fimDaSemana(data: string): string {
  return new Date(paraUtc(inicioDaSemana(data)) + 6 * DIA_MS).toISOString().slice(0, 10);
}

export function percentualPorFaltas(faltas: number): number {
  if (faltas <= 0) return 0.1;
  if (faltas === 1) return 0.05;
  return 0;
}

/**
 * Constância do mês.
 * Um dia agendado sem postagem pode ser reposto com uma postagem extra
 * (em dia de folga, ou um segundo vídeo em qualquer dia) até domingo da mesma semana.
 * Só vira falta depois que a semana termina sem reposição.
 *
 * @param dias   dias do mês (podem incluir dias da semana vizinha, para contar reposições)
 * @param hoje   data de hoje, AAAA-MM-DD
 * @param mes    mês do fechamento, AAAA-MM (faltas contam no mês do dia perdido)
 */
export function calcularConstancia(dias: DiaPostagem[], hoje: string, mes: string): ResultadoConstancia {
  const semanas = new Map<string, DiaPostagem[]>();
  for (const d of dias) {
    const k = inicioDaSemana(d.data);
    if (!semanas.has(k)) semanas.set(k, []);
    semanas.get(k)!.push(d);
  }
  let faltas = 0;
  let aRepor = 0;
  for (const [, ds] of semanas) {
    const domingo = fimDaSemana(ds[0].data);
    const encerrada = domingo < hoje;
    // dias perdidos: agendados, sem postagem, que já passaram (hoje ainda dá para postar)
    const perdidos = ds.filter((d) => d.agendado && d.postagens === 0 && d.data < hoje);
    const extras = ds.reduce((s, d) => s + Math.max(0, d.postagens - (d.agendado ? 1 : 0)), 0);
    const naoRepostos = Math.max(0, perdidos.length - extras);
    if (naoRepostos === 0) continue;
    // só conta no mês os dias perdidos que são deste mês (os primeiros não cobertos pela reposição)
    const perdidosOrdenados = [...perdidos].sort((a, b) => a.data.localeCompare(b.data));
    const naoCobertos = perdidosOrdenados.slice(perdidos.length - naoRepostos);
    const doMes = naoCobertos.filter((d) => d.data.startsWith(mes)).length;
    if (encerrada) faltas += doMes;
    else aRepor += doMes;
  }
  return { faltas, aRepor, percentual: percentualPorFaltas(faltas) };
}

/** Pagamento do mês. */
export function calcularPagamento(views: number, meta: number | null, faltas: number, ajudas = 0, extrasCentavos = 0): ResultadoPagamento {
  const v = Math.max(0, Math.floor(views));
  const brutoCentavos = Math.round((v * CENTAVOS_POR_MIL_VIEWS) / 1000);
  const percentualConstancia = percentualPorFaltas(faltas);
  const constanciaCentavos = Math.round(brutoCentavos * percentualConstancia);
  const bateuMeta = meta !== null && meta > 0 && v >= meta;
  const bonusMetaCentavos = bateuMeta ? Math.round((meta! * BONUS_META_CENTAVOS_POR_MIL) / 1000) : 0;
  const nAjudas = Math.max(0, Math.floor(ajudas));
  const bonusAjudaCentavos = nAjudas * BONUS_AJUDA_CENTAVOS;
  const bonusExtraCentavos = Math.max(0, Math.round(extrasCentavos));
  return {
    views: v,
    meta,
    bateuMeta,
    faltas,
    percentualConstancia,
    brutoCentavos,
    constanciaCentavos,
    bonusMetaCentavos,
    ajudas: nAjudas,
    bonusAjudaCentavos,
    bonusExtraCentavos,
    totalCentavos: brutoCentavos + constanciaCentavos + bonusMetaCentavos + bonusAjudaCentavos + bonusExtraCentavos,
  };
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
/** 306200 → "R$ 3.062,00" */
export function formatarReais(centavos: number): string {
  return brl.format(centavos / 100).replace(/ /g, " ");
}

const num = new Intl.NumberFormat("pt-BR");
/** 612400 → "612.400" */
export function formatarNumero(n: number): string {
  return num.format(n);
}
