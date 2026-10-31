import { DIAS_NOMES, diaDaSemana } from "./datas";

/**
 * Vídeo extra vale só no dia escolhido pelo gestor: 24 horas, das 00:00 às 23:59 (Brasília).
 * Antes do dia aparece como "em breve"; no dia dá para mandar o link; depois some.
 */
export function janelaExtra(dia: string, hoje: string): { fase: "antes" | "hoje" | "passou"; texto: string; detalhe: string } {
  const n = Math.round((Date.UTC(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8)) - Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8))) / 86_400_000);
  const nome = `${DIAS_NOMES[diaDaSemana(dia) - 1].toLowerCase()}, ${dia.slice(8)}/${dia.slice(5, 7)}`;
  if (n < 0) return { fase: "passou", texto: `Era ${nome}`, detalhe: "encerrado" };
  if (n === 0) return { fase: "hoje", texto: "Vale HOJE: poste até 23:59", detalhe: "só hoje" };
  return { fase: "antes", texto: `Vale só ${n === 1 ? `amanhã (${nome})` : nome}, das 00:00 às 23:59`, detalhe: n === 1 ? "começa amanhã" : `começa em ${n} dias` };
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
