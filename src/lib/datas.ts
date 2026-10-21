/** Datas sempre no fuso de Brasília, no formato AAAA-MM-DD. */
const FUSO = "America/Sao_Paulo";
const DIA_MS = 86_400_000;

export function hojeBrasil(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}
export function mesDe(data: string): string {
  return data.slice(0, 7);
}
export function primeiroDia(mes: string): string {
  return `${mes}-01`;
}
export function ultimoDia(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
}
export function diasNoMes(mes: string): number {
  return Number(ultimoDia(mes).slice(8));
}
export function somarDias(data: string, n: number): string {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d) + n * DIA_MS).toISOString().slice(0, 10);
}
/** 1 = segunda ... 7 = domingo */
export function diaDaSemana(data: string): number {
  const [a, m, d] = data.split("-").map(Number);
  const w = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return w === 0 ? 7 : w;
}
export function intervalo(de: string, ate: string): string[] {
  const out: string[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) out.push(d);
  return out;
}
export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export function nomeMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}
export const DIAS_CURTOS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
export const DIAS_NOMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
