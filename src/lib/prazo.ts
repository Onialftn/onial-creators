import { DIAS_NOMES, diaDaSemana } from "./datas";

/** Horário do vídeo extra no dia escolhido (Brasília): das 08:00 às 22:00. */
export const EXTRA_INICIO = 8 * 60;
export const EXTRA_FIM = 22 * 60;
export const HORARIO_EXTRA = "08:00 às 22:00";

/** Minutos desde a meia-noite em Brasília (ex.: 08:30 → 510). */
export function minutosBrasil(agora = new Date()): number {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(agora).split(":").map(Number);
  return h * 60 + m;
}

/**
 * Vídeo extra vale só no dia escolhido pelo gestor, das 08:00 às 22:00 (Brasília): postar e mandar o link nesse horário.
 * Antes aparece como "em breve"; dentro do horário dá para mandar o link; depois das 22:00 fecha.
 */
export function janelaExtra(dia: string, hoje: string, minutos = EXTRA_INICIO): { fase: "antes" | "hoje" | "passou"; texto: string; detalhe: string } {
  const n = Math.round((Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8)) - Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8))) / 86_400_000);
  const nome = `${DIAS_NOMES[diaDaSemana(dia) - 1].toLowerCase()}, ${dia.slice(8)}/${dia.slice(5, 7)}`;
  if (n < 0 || (n === 0 && minutos >= EXTRA_FIM)) return { fase: "passou", texto: `Era ${nome}, das ${HORARIO_EXTRA}`, detalhe: "encerrado" };
  if (n === 0 && minutos < EXTRA_INICIO) return { fase: "antes", texto: `Vale HOJE, das ${HORARIO_EXTRA}`, detalhe: "começa às 08:00" };
  if (n === 0) return { fase: "hoje", texto: "Vale HOJE: poste até 22:00", detalhe: "só hoje" };
  return { fase: "antes", texto: `Vale só ${n === 1 ? `amanhã (${nome})` : nome}, das ${HORARIO_EXTRA}`, detalhe: n === 1 ? "começa amanhã" : `começa em ${n} dias` };
}

/** "Válido pro 2° vídeo do dia" (no título, regras ou descrição) → 2. Sem número → null. */
export function ordemDoExtra(x: { titulo: string; regras?: string | null; descricao?: string | null }): number | null {
  const m = /(\d+)\s*[°º]\s*v[íi]deo/i.exec(`${x.titulo} ${x.regras ?? ""} ${x.descricao ?? ""}`);
  return m ? Number(m[1]) : null;
}

/**
 * Agrupa os extras por dia do vídeo. Dias de hoje em diante primeiro (do mais perto ao mais longe),
 * depois os que já passaram (do mais recente ao mais antigo). Dentro do dia: 1º, 2º, 3º vídeo... e depois o resto.
 */
export function extrasPorDia<T extends { prazo: string; titulo: string; regras?: string | null; descricao?: string | null; valor_centavos: number }>(extras: T[], hoje: string): { dia: string; extras: T[] }[] {
  const mapa = new Map<string, T[]>();
  for (const x of extras) mapa.set(x.prazo, [...(mapa.get(x.prazo) ?? []), x]);
  const ordem = (x: T) => ordemDoExtra(x) ?? 99;
  const dias = [...mapa.keys()].sort((a, b) => {
    const fa = a >= hoje, fb = b >= hoje;
    if (fa !== fb) return fa ? -1 : 1;
    return fa ? a.localeCompare(b) : b.localeCompare(a);
  });
  return dias.map((dia) => ({ dia, extras: mapa.get(dia)!.sort((a, b) => ordem(a) - ordem(b) || b.valor_centavos - a.valor_centavos || a.titulo.localeCompare(b.titulo)) }));
}

/** "Hoje", "Amanhã", "Ontem" ou "em 3 dias" / "há 3 dias". */
export function quandoExtra(dia: string, hoje: string): string {
  const n = Math.round((Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8)) - Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8))) / 86_400_000);
  return n === 0 ? "Hoje" : n === 1 ? "Amanhã" : n === -1 ? "Ontem" : n > 0 ? `em ${n} dias` : `há ${-n} dias`;
}
