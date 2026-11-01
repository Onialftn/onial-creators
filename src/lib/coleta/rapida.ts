import "server-only";
import { revalidatePath, unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sincronizarVideos } from "./coletar";

/** No máximo uma busca rápida por conta a cada 10 minutos (o resultado fica guardado e é compartilhado entre os acessos). */
const MINUTOS = 10;
const rapidaDaConta = (contaId: string) =>
  unstable_cache(async () => {
    const novos = await sincronizarVideos(contaId).catch(() => 0);
    return { em: Date.now(), novos };
  }, ["videos-rapida", contaId], { revalidate: MINUTOS * 60 })();

/**
 * Procura vídeos novos das contas dos criadores (em segundo plano, sem atrasar a página).
 * Assim o dia de postagem é marcado poucos minutos depois de a pessoa postar, sem esperar a coleta das 06:00.
 */
export async function buscarVideosNovos(criadores: string[] | "todos") {
  const admin = supabaseAdmin();
  let q = admin.from("contas_plataforma").select("id").is("erro", null);
  if (criadores !== "todos") q = q.in("criador_id", criadores);
  const { data: contas } = await q;
  const r = await Promise.all((contas ?? []).map((c) => rapidaDaConta(c.id as string).catch(() => ({ em: 0, novos: 0 }))));
  if (r.some((x) => x.novos > 0)) revalidatePath("/", "layout");
}
