import "server-only";
import { MAPAS } from "@/lib/ia/mapas";
import { enviarPush } from "@/lib/notificacoes";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Nova novidade: só manda para a tela do celular (não entra no sino). No site, aparece o número em "Novidades" no menu. */
export async function avisarNovidade(n: { id: string; mapa: string; titulo: string }, quem: string[]) {
  const admin = supabaseAdmin();
  const mapa = MAPAS.find((m) => m.id === n.mapa);
  const aviso = { tipo: "novidade", titulo: `Novidade: ${mapa ? `${mapa.falado} ${mapa.emoji}` : "Site/App 📱"}`, texto: n.titulo, link: `/novidades#n-${n.id}`, chave: `novidade:${n.id}` };
  await Promise.all(quem.map((id) => enviarPush(admin, id, aviso).catch(() => undefined)));
}

/** Novidades duram 7 dias: depois disso são apagadas (roda todo dia junto com a coleta). */
export const DIAS_NOVIDADE = 7;
export const limiteNovidades = () => new Date(Date.now() - DIAS_NOVIDADE * 86_400_000).toISOString();
export async function apagarNovidadesVelhas() {
  await supabaseAdmin().from("novidades").delete().lt("criado_em", limiteNovidades());
}
