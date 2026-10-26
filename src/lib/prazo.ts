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
