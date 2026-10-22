import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hojeBrasil, mesDe, primeiroDia } from "@/lib/datas";

export type TipoIA = "roteiro" | "ideia" | "avaliacao";
/** Quantos pedidos cada criador pode fazer por mês (o gestor não tem limite). */
export const LIMITE_MES: Record<TipoIA, number> = { roteiro: 60, ideia: 40, avaliacao: 30 };

/** início do mês atual em Brasília, como instante */
export function inicioDoMes() {
  return new Date(`${primeiroDia(mesDe(hojeBrasil()))}T00:00:00-03:00`).toISOString();
}

export async function usadosNoMes(criadorId: string, tipo: TipoIA) {
  const { count } = await supabaseAdmin().from("uso_ia").select("id", { count: "exact", head: true }).eq("criador_id", criadorId).eq("tipo", tipo).gte("criado_em", inicioDoMes());
  return count ?? 0;
}

export async function registrarUso(criadorId: string, tipo: TipoIA, u: { tokensEntrada: number; tokensSaida: number; custoUsd: number }) {
  await supabaseAdmin().from("uso_ia").insert({ criador_id: criadorId, tipo, tokens_entrada: u.tokensEntrada, tokens_saida: u.tokensSaida, custo_usd: u.custoUsd });
}
