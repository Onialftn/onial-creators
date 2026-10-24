"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/dados";
import { notificar } from "@/lib/notificacoes";
import { supabaseAdmin } from "@/lib/supabase/server";

const NOME = { instagram: "Instagram", tiktok: "TikTok" } as const;
type Rede = keyof typeof NOME;
const rede = (v: FormDataEntryValue | null): Rede | null => (v === "instagram" || v === "tiktok" ? v : null);

/** O criador informa o @ e pede para o gestor liberar a conta no app (modo de teste). */
export async function pedirLiberacao(f: FormData) {
  const { perfil } = await usuarioAtual();
  const r = rede(f.get("rede"));
  const usuario = String(f.get("usuario") ?? "").trim().replace(/^@+/, "").replace(/\s+/g, "").slice(0, 60);
  if (!r) redirect("/redes?erro=" + encodeURIComponent("Rede inválida."));
  if (usuario.length < 2) redirect("/redes?erro=" + encodeURIComponent(`Escreva o seu @ do ${NOME[r]}.`));
  const admin = supabaseAdmin();
  await admin.from("liberacoes").upsert({ criador_id: perfil.id, rede: r, usuario, liberado: false, pedido_em: new Date().toISOString(), liberado_em: null });
  const { data: gestores } = await admin.from("perfis").select("id").eq("papel", "gestor");
  await Promise.all((gestores ?? []).map((g) => notificar(g.id, { tipo: "rede", titulo: `Liberar o ${NOME[r]} de ${perfil.nome.split(" ")[0]}`, texto: `@${usuario} pediu liberação para conectar o ${NOME[r]}. Veja em Painel do gestor → Configurações.`, link: "/gestor/config#liberar", chave: `liberar:${r}:${perfil.id}:${usuario}` }, admin).catch(() => undefined)));
  revalidatePath("/redes");
  redirect("/redes?ok=" + encodeURIComponent(`Pedido enviado! Assim que o gestor liberar o ${NOME[r]}, você recebe uma notificação.`));
}

/** O gestor marca que já liberou (ou desfaz). */
export async function marcarLiberado(f: FormData) {
  const { perfil } = await usuarioAtual();
  if (perfil.papel !== "gestor") redirect("/");
  const r = rede(f.get("rede"));
  const criador = String(f.get("criador") ?? "");
  const sim = f.get("sim") === "1";
  if (!r || !criador) redirect("/gestor/config?erro=" + encodeURIComponent("Pedido inválido.") + "#liberar");
  const admin = supabaseAdmin();
  await admin.from("liberacoes").update({ liberado: sim, liberado_em: sim ? new Date().toISOString() : null }).eq("criador_id", criador).eq("rede", r);
  if (sim) {
    await notificar(criador, r === "instagram"
      ? { tipo: "rede", titulo: "Seu Instagram foi liberado ✅", texto: "Falta 1 passo: aceite o convite de testador e depois conecte em Minhas redes. Toque para ver como.", link: "/redes", chave: `liberado:instagram:${criador}:${Date.now()}` }
      : { tipo: "rede", titulo: "Seu TikTok foi liberado ✅", texto: "Agora é só conectar o TikTok em Minhas redes.", link: "/redes", chave: `liberado:tiktok:${criador}:${Date.now()}` }, admin).catch(() => undefined);
  }
  revalidatePath("/gestor/config");
  redirect("/gestor/config?ok=" + encodeURIComponent(sim ? `${NOME[r]} marcado como liberado. O criador foi avisado.` : "Desmarcado.") + "#liberar");
}
