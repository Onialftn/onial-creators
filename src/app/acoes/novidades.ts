"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/dados";
import { MAPAS } from "@/lib/ia/mapas";
import { notificar } from "@/lib/notificacoes";
import { avisarNovidade } from "@/lib/novidades";
import { supabaseAdmin } from "@/lib/supabase/server";

const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
function irPara(url: string): never {
  revalidatePath("/", "layout");
  redirect(url);
}
const primeiro = (n: string) => n.split(" ")[0];

async function soGestor() {
  const u = await usuarioAtual();
  if (u.perfil.papel !== "gestor") redirect("/");
  return u;
}

export async function publicarNovidade(f: FormData) {
  await soGestor();
  const titulo = t(f, "titulo").slice(0, 120);
  const texto = t(f, "texto").slice(0, 5000);
  const mapa = t(f, "mapa");
  if (titulo.length < 3) irPara("/novidades?erro=" + encodeURIComponent("Dê um título para a novidade."));
  if (mapa && !MAPAS.some((m) => m.id === mapa)) irPara("/novidades?erro=" + encodeURIComponent("Mapa inválido."));
  const admin = supabaseAdmin();
  const { data: n } = await admin.from("novidades").insert({ titulo, texto, mapa }).select("id, mapa, titulo").single();
  if (!n) irPara("/novidades?erro=" + encodeURIComponent("Não consegui publicar. Tente de novo."));
  const { data: todos } = await admin.from("perfis").select("id");
  await avisarNovidade(n, (todos ?? []).map((p) => p.id as string));
  irPara("/novidades?ok=" + encodeURIComponent("Novidade publicada e enviada para a equipe."));
}

export async function apagarNovidade(f: FormData) {
  await soGestor();
  await supabaseAdmin().from("novidades").delete().eq("id", t(f, "id"));
  irPara("/novidades?ok=" + encodeURIComponent("Novidade apagada."));
}

export async function enviarSugestao(f: FormData) {
  const { perfil } = await usuarioAtual();
  const texto = t(f, "texto").slice(0, 2000);
  if (texto.length < 5) irPara("/sugestoes?erro=" + encodeURIComponent("Escreva a sua sugestão."));
  const admin = supabaseAdmin();
  const { count } = await admin.from("sugestoes").select("id", { count: "exact", head: true }).eq("criador_id", perfil.id).eq("status", "enviada");
  if ((count ?? 0) >= 10) irPara("/sugestoes?erro=" + encodeURIComponent("Você já tem 10 sugestões esperando resposta. Aguarde o gestor responder."));
  const { data: s } = await admin.from("sugestoes").insert({ criador_id: perfil.id, texto }).select("id").single();
  if (!s) irPara("/sugestoes?erro=" + encodeURIComponent("Não consegui enviar. Tente de novo."));
  const { data: gestores } = await admin.from("perfis").select("id").eq("papel", "gestor");
  await Promise.all((gestores ?? []).filter((g) => g.id !== perfil.id).map((g) => notificar(g.id, { tipo: "sugestao", titulo: `${primeiro(perfil.nome)} mandou uma sugestão 💡`, texto: texto.slice(0, 60), link: "/gestor/sugestoes", chave: `sugestao:${s.id}` }, admin).catch(() => undefined)));
  irPara("/sugestoes?ok=" + encodeURIComponent("Sugestão enviada! Você recebe uma notificação quando o gestor responder."));
}

export async function responderSugestao(f: FormData) {
  await soGestor();
  const id = t(f, "id");
  const aprovar = t(f, "decisao") === "aprovar";
  const motivo = aprovar ? "" : t(f, "motivo").slice(0, 1000);
  const admin = supabaseAdmin();
  const { data: s } = await admin.from("sugestoes").update({ status: aprovar ? "aprovada" : "recusada", motivo, respondido_em: new Date().toISOString() }).eq("id", id).select("id, criador_id, texto").single();
  if (s)
    await notificar(s.criador_id, aprovar
      ? { tipo: "sugestao", titulo: "Sugestão aprovada ✅", texto: s.texto.slice(0, 60), link: "/sugestoes", chave: `sugestao:ok:${id}:${Date.now()}` }
      : { tipo: "sugestao", titulo: "Sugestão recusada", texto: motivo ? motivo.slice(0, 80) : s.texto.slice(0, 60), link: "/sugestoes", chave: `sugestao:nao:${id}:${Date.now()}` }, admin).catch(() => undefined);
  irPara("/gestor/sugestoes?ok=" + encodeURIComponent(aprovar ? "Sugestão aprovada. Avisei quem mandou." : "Sugestão recusada. Avisei quem mandou."));
}
