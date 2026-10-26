import { DIAS_NOMES, diaDaSemana } from "./datas";

/** Texto do prazo: vence no fim do dia escolhido (23:59, horário de Brasília). */
export function textoPrazo(prazo: string, hoje: string): { texto: string; faltam: string; urgente: boolean } {
  const dias = Math.round((Date.UTC(+prazo.slice(0, 4), +prazo.slice(5, 7) - 1, +prazo.slice(8)) - Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8))) / 86_400_000);
  const dia = `${DIAS_NOMES[diaDaSemana(prazo) - 1].toLowerCase()}, ${prazo.slice(8)}/${prazo.slice(5, 7)}`;
  if (dias < 0) return { texto: `Venceu ${dia}`, faltam: "encerrado", urgente: true };
  if (dias === 0) return { texto: "Vence HOJE às 23:59", faltam: "último dia", urgente: true };
  if (dias === 1) return { texto: `Vence amanhã (${dia}) às 23:59`, faltam: "falta 1 dia", urgente: true };
  return { texto: `Vence ${dia} às 23:59`, faltam: `faltam ${dias} dias`, urgente: false };
}
