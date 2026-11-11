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
  /** Quantos desses vídeos foram vídeos extras (pagos à parte): não contam como reposição de falta. */
  extras?: number;
}

/** Postagens a mais do dia que repõem falta: o que passou do 1 obrigatório, sem contar os vídeos extras. */
export function sobraParaRepor(d: DiaPostagem): number {
  return Math.max(0, d.postagens - (d.agendado ? 1 : 0) - (d.extras ?? 0));
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

/**
 * Dia em que a contagem de faltas começa (pedido do gestor em 31/10/2026: "limpa todas as faltas e conta a partir de hoje").
 * Dias de postagem antes desta data não viram falta nem "a repor".
 */
export const INICIO_CONSTANCIA = "2026-10-31";

/** Antes do início da contagem, nenhum dia é obrigatório (ninguém leva falta) e os vídeos desses dias não repõem faltas depois. */
export function aPartirDoInicio(dias: DiaPostagem[], inicio = INICIO_CONSTANCIA): DiaPostagem[] {
  return dias.map((d) => (d.data < inicio ? { ...d, agendado: false, extras: d.postagens } : d));
}

export function percentualPorFaltas(faltas: number): number {
  if (faltas <= 0) return 0.1;
  if (faltas === 1) return 0.05;
  return 0;
}

/**
 * Reposição com data marcada (pedido do gestor em 11/11/2026), vale para faltas a partir desta segunda-feira.
 * Antes dela fica a regra antiga (repor até domingo da mesma semana com um vídeo a mais, sem marcar data).
 */
export const REPOSICAO_MARCADA_DESDE = "2026-11-09";
/** A reposição pode ser marcada até 7 dias depois da falta (sem passar do fim do mês). */
export const DIAS_PARA_REPOR = 7;

/** Dia marcado pelo criador para postar o vídeo que repõe uma falta. */
export interface Reposicao {
  /** dia da falta, AAAA-MM-DD */
  falta: string;
  /** dia marcado para repor, AAAA-MM-DD */
  dia: string;
}

/**
 * Situação de uma falta na regra nova:
 * - reposta: postou o vídeo a mais no dia marcado
 * - pode_marcar: ainda não marcou e está no prazo
 * - marcada: marcou um dia que ainda não passou (ou é hoje e ainda não postou)
 * - perdida: passou o dia marcado sem postar, ou acabou o prazo sem marcar (vira falta de vez)
 */
export type SituacaoFalta = "reposta" | "pode_marcar" | "marcada" | "perdida";

function somarDiasData(data: string, n: number): string {
  return new Date(paraUtc(data) + n * DIA_MS).toISOString().slice(0, 10);
}
function ultimoDiaDoMes(data: string): string {
  const [a, m] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}

/** Último dia em que dá para repor a falta: 7 dias depois, sem passar do último dia do mês (o mês fecha com o que tiver). */
export function prazoParaRepor(falta: string): string {
  const sete = somarDiasData(falta, DIAS_PARA_REPOR);
  const fimMes = ultimoDiaDoMes(falta);
  return sete < fimMes ? sete : fimMes;
}

/** O dia escolhido vale para repor esta falta? (depois da falta, a partir de hoje, até o prazo) */
export function diaValidoParaRepor(falta: string, dia: string, hoje: string): boolean {
  return dia > falta && dia >= hoje && dia <= prazoParaRepor(falta);
}

/**
 * Regra nova: situação de cada falta (dia agendado sem postagem que já passou) a partir de REPOSICAO_MARCADA_DESDE.
 * No dia marcado é preciso postar um vídeo a mais (o que passou do obrigatório do dia, sem contar vídeo extra).
 * Se duas faltas marcarem o mesmo dia, precisa de um vídeo a mais para cada uma.
 */
export function situacaoDasFaltas(dias: DiaPostagem[], reposicoes: Reposicao[], hoje: string, desde = REPOSICAO_MARCADA_DESDE): Map<string, SituacaoFalta> {
  const sobra = new Map(dias.map((d) => [d.data, sobraParaRepor(d)]));
  const marcada = new Map(reposicoes.map((r) => [r.falta, r.dia]));
  const out = new Map<string, SituacaoFalta>();
  const faltas = dias.filter((d) => d.data >= desde && d.agendado && d.postagens === 0 && d.data < hoje).map((d) => d.data).sort();
  for (const f of faltas) {
    const dia = marcada.get(f);
    const valida = dia !== undefined && dia > f && dia <= prazoParaRepor(f);
    if (!valida) {
      out.set(f, hoje <= prazoParaRepor(f) ? "pode_marcar" : "perdida");
      continue;
    }
    // o vídeo a mais só conta quando o dia marcado chega (hoje já vale, se já postou)
    const cabe = dia <= hoje && (sobra.get(dia) ?? 0) > 0;
    if (cabe) {
      sobra.set(dia, sobra.get(dia)! - 1);
      out.set(f, "reposta");
    } else out.set(f, dia < hoje ? "perdida" : "marcada");
  }
  return out;
}

/**
 * Constância do mês.
 * - Faltas a partir de REPOSICAO_MARCADA_DESDE: o criador marca um dia (até 7 dias depois, sem passar do fim do mês)
 *   e posta um vídeo a mais nele. Não postou no dia marcado ou não marcou no prazo: vira falta (situacaoDasFaltas).
 * - Faltas antes disso (regra antiga): repostas com uma postagem a mais até domingo da mesma semana, sem marcar data.
 * Vídeo extra (pago à parte) nunca conta como reposição.
 *
 * @param dias       dias do mês (podem incluir dias da semana vizinha, para contar reposições)
 * @param hoje       data de hoje, AAAA-MM-DD
 * @param mes        mês do fechamento, AAAA-MM (faltas contam no mês do dia perdido)
 * @param reposicoes dias marcados para repor (regra nova)
 */
export function calcularConstancia(dias: DiaPostagem[], hoje: string, mes: string, reposicoes: Reposicao[] = []): ResultadoConstancia {
  // regra nova
  let faltas = 0;
  let aRepor = 0;
  for (const [f, s] of situacaoDasFaltas(dias, reposicoes, hoje)) {
    if (!f.startsWith(mes)) continue;
    if (s === "perdida") faltas++;
    else if (s !== "reposta") aRepor++;
  }
  // regra antiga (semanas antes de REPOSICAO_MARCADA_DESDE)
  const semanas = new Map<string, DiaPostagem[]>();
  for (const d of dias.filter((x) => x.data < REPOSICAO_MARCADA_DESDE)) {
    const k = inicioDaSemana(d.data);
    if (!semanas.has(k)) semanas.set(k, []);
    semanas.get(k)!.push(d);
  }
  for (const [, ds] of semanas) {
    const domingo = fimDaSemana(ds[0].data);
    const encerrada = domingo < hoje;
    // dias perdidos: agendados, sem postagem, que já passaram (hoje ainda dá para postar)
    const perdidos = ds.filter((d) => d.agendado && d.postagens === 0 && d.data < hoje);
    const extras = ds.reduce((s, d) => s + sobraParaRepor(d), 0);
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
