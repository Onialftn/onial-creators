import "server-only";
import { LIMITE_MES, usadosNoMes } from "@/lib/ia/uso";
import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/server";

export const BALDE = "avaliacoes";

/** Quem está pedindo e se ainda tem avaliações no mês. */
export async function quemPede() {
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { erro: "Entre de novo no site.", status: 401 } as const;
  const { data: perfil } = await sb.from("perfis").select("papel").eq("id", user.id).single();
  const usados = await usadosNoMes(user.id, "avaliacao");
  if (perfil?.papel !== "gestor" && usados >= LIMITE_MES.avaliacao)
    return { erro: `Você já usou as ${LIMITE_MES.avaliacao} avaliações deste mês. Fale com o gestor se precisar de mais.`, status: 429 } as const;
  return { id: user.id, usados } as const;
}

/** Apaga tudo o que ficou na pasta do criador (envios que não terminaram). */
export async function limparPasta(criadorId: string, soEste?: string) {
  const st = supabaseAdmin().storage.from(BALDE);
  const pastas = soEste ? [soEste] : ((await st.list(criadorId)).data ?? []).map((p) => p.name);
  for (const p of pastas) {
    const arquivos = ((await st.list(`${criadorId}/${p}`)).data ?? []).map((a) => `${criadorId}/${p}/${a.name}`);
    if (arquivos.length) await st.remove(arquivos);
  }
}
