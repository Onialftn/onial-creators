/** Gravações: regras simples da agenda (sem banco), para poder testar. */

export const DURACOES = [30, 45, 60];
export const MAX_AJUDANTES = 5;
/** horários de 30 em 30 minutos, das 08:00 às 23:30 */
export const HORARIOS = Array.from({ length: 32 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

export interface Pedido { id: string; criador_id: string; dia: string; hora: string; duracao_min: number; vagas: number; mapa: string; descricao: string; referencia?: string; status: "aberto" | "feito" | "cancelado" }
export interface Ajuda { pedido_id: string; ajudante_id: string; presente: boolean }

/** Link de vídeo aceito como referência (http/https) e o id quando é do YouTube. */
export function linkReferencia(texto: string): { url: string; youtube: string | null } | null {
  const t = texto.trim();
  if (!t) return null;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
  const yt = /(^|\.)youtube\.com$/.test(u.hostname)
    ? (u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] ?? u.searchParams.get("v"))
    : u.hostname === "youtu.be" ? u.pathname.slice(1, 12) : null;
  return { url: u.toString(), youtube: yt && /^[\w-]{11}$/.test(yt) ? yt : null };
}

/** Instante em que a gravação começa (horário de Brasília). */
export const inicioDe = (p: Pick<Pedido, "dia" | "hora">) => new Date(`${p.dia}T${p.hora.slice(0, 5)}:00-03:00`);

/** "19:00 às 19:45" */
export function faixaHorario(hora: string, duracao: number): string {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  const fim = h * 60 + m + duracao;
  const hh = (x: number) => `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  return `${hh(h * 60 + m)} às ${hh(fim)}`;
}

export type Situacao = "aberto" | "lotado" | "confirmar" | "feito" | "cancelado" | "passou";

/** Em que pé o pedido está (agora = instante atual). */
export function situacao(p: Pedido, ajudantes: number, agora = new Date()): Situacao {
  if (p.status === "cancelado") return "cancelado";
  if (p.status === "feito") return "feito";
  if (inicioDe(p) <= agora) return ajudantes > 0 ? "confirmar" : "passou";
  return ajudantes >= p.vagas ? "lotado" : "aberto";
}

/** Pode aceitar ajudar? (não é o próprio pedido, ainda não começou, tem vaga e ainda não aceitou) */
export function podeAceitar(p: Pedido, ajudas: Ajuda[], quem: string, agora = new Date()): boolean {
  const doPedido = ajudas.filter((a) => a.pedido_id === p.id);
  return p.criador_id !== quem && !doPedido.some((a) => a.ajudante_id === quem) && situacao(p, doPedido.length, agora) === "aberto";
}

/** Quantas gravações a pessoa ajudou e foram confirmadas (para o bônus de R$ 25 cada). */
export function ajudasConfirmadas(pedidos: Pedido[], ajudas: Ajuda[], quem: string, mes: string): number {
  const feitos = new Set(pedidos.filter((p) => p.status === "feito" && p.dia.startsWith(mes)).map((p) => p.id));
  return ajudas.filter((a) => a.ajudante_id === quem && a.presente && feitos.has(a.pedido_id)).length;
}

export interface Sugestao { id: string; pedido_id: string; criador_id: string; dia: string; hora: string; mensagem: string; status: "pendente" | "aceita" | "recusada" }
