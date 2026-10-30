import "server-only";
import { MAPAS } from "@/lib/ia/mapas";
import { notificar } from "@/lib/notificacoes";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Aviso de uma novidade (a chave evita mandar duas vezes para a mesma pessoa). */
export async function avisarNovidade(n: { id: string; mapa: string; titulo: string }, quem: string[]) {
  const admin = supabaseAdmin();
  const mapa = MAPAS.find((m) => m.id === n.mapa);
  await Promise.all(quem.map((id) => notificar(id, { tipo: "novidade", titulo: `Novidade: ${mapa ? `${mapa.falado} ${mapa.emoji}` : n.titulo}`, texto: mapa ? n.titulo : "Toque para ver.", link: `/novidades#n-${n.id}`, chave: `novidade:${n.id}` }, admin).catch(() => undefined)));
}

/** Novidades dos últimos 3 dias que a pessoa ainda não recebeu (para quem entrou na equipe depois ou novidade criada direto no banco). */
export async function avisarNovidadesRecentes(pessoa: string) {
  const admin = supabaseAdmin();
  const { data } = await admin.from("novidades").select("id, mapa, titulo").gte("criado_em", new Date(Date.now() - 3 * 86_400_000).toISOString());
  for (const n of data ?? []) await avisarNovidade(n, [pessoa]);
}
