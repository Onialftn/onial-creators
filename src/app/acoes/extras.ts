"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/dados";
import { hojeBrasil, mesDe } from "@/lib/datas";
import { linkReferencia } from "@/lib/gravar";
import { notificar } from "@/lib/notificacoes";
import { formatarReais } from "@/lib/pagamento";
import { supabaseAdmin } from "@/lib/supabase/server";

const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const diaBr = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
function irPara(url: string): never {
  revalidatePath("/", "layout");
  redirect(url);
}
/** "25", "25,50", "R$ 1.200,00" → centavos */
export async function lerReais(v: string): Promise<number> {
  const limpo = v.replace(/[^\d,.]/g, "");
  const n = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

async function soGestor() {
  const u = await usuarioAtual();
  if (u.perfil.papel !== "gestor") redirect("/");
  return u;
}

export async function criarExtra(f: FormData) {
  await soGestor();
  const titulo = t(f, "titulo").slice(0, 120);
  const descricao = t(f, "descricao").slice(0, 1000);
  const valor = await lerReais(t(f, "valor"));
  const prazo = t(f, "prazo");
  const volta = (e: string) => irPara(`/gestor/extras?erro=${encodeURIComponent(e)}`);
  if (titulo.length < 3) volta("Dê um título para o extra.");
  if (!(valor >= 100)) volta("Coloque o valor do extra (mínimo R$ 1,00).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo) || prazo < hojeBrasil()) volta("Escolha um prazo de hoje em diante.");
  const admin = supabaseAdmin();
  const { data: novo } = await admin.from("extras").insert({ titulo, descricao, valor_centavos: valor, prazo }).select("id").single();
  const { data: criadores } = await admin.from("perfis").select("id").eq("papel", "criador");
  await Promise.all((criadores ?? []).map((c) => notificar(c.id, { tipo: "pagamento", titulo: `Vídeo extra: +${formatarReais(valor)} 💰`, texto: `${titulo}. Poste até ${diaBr(prazo)} e mande o link em Dias de postagem.`, link: "/dias#extras", chave: `extra:novo:${novo?.id}` }, admin).catch(() => undefined)));
  irPara(`/gestor/extras?ok=${encodeURIComponent("Extra criado! A equipe foi avisada.")}`);
}

export async function encerrarExtra(f: FormData) {
  await soGestor();
  await supabaseAdmin().from("extras").update({ ativo: f.get("ativo") === "1" }).eq("id", t(f, "extra"));
  irPara(`/gestor/extras?ok=${encodeURIComponent(f.get("ativo") === "1" ? "Extra reaberto." : "Extra encerrado: ninguém mais consegue enviar.")}`);
}

/** O criador manda o link do vídeo extra que postou. */
export async function enviarExtra(f: FormData) {
  const { perfil } = await usuarioAtual();
  const volta = (e: string, ok = false) => irPara(`/dias?${ok ? "ok" : "erro"}=${encodeURIComponent(e)}#extras`);
  const admin = supabaseAdmin();
  const { data: ex } = await admin.from("extras").select("*").eq("id", t(f, "extra")).maybeSingle();
  if (!ex || !ex.ativo || ex.prazo < hojeBrasil()) volta("Esse extra não está mais aberto.");
  const ref = linkReferencia(t(f, "link"));
  if (!ref) volta("Cole o link do vídeo que você postou.");
  const { data: atual } = await admin.from("entregas_extra").select("status").eq("extra_id", ex.id).eq("criador_id", perfil.id).maybeSingle();
  if (atual?.status === "aprovado") volta("Esse extra já foi aprovado para você.");
  await admin.from("entregas_extra").upsert({ extra_id: ex.id, criador_id: perfil.id, link: ref!.url.slice(0, 500), status: "enviado", motivo: "", enviado_em: new Date().toISOString(), aprovado_em: null, mes: null });
  const { data: gestores } = await admin.from("perfis").select("id").eq("papel", "gestor");
  await Promise.all((gestores ?? []).map((g) => notificar(g.id, { tipo: "pagamento", titulo: `${perfil.nome.split(" ")[0]} mandou um vídeo extra`, texto: `${ex.titulo} (${formatarReais(ex.valor_centavos)}). Confira e aprove.`, link: "/gestor/extras", chave: `extra:enviado:${ex.id}:${perfil.id}:${Date.now()}` }, admin).catch(() => undefined)));
  volta("Link enviado! Assim que o gestor aprovar, o valor entra no seu total do mês.", true);
}

/** O gestor aprova (o valor entra no mês de hoje) ou recusa a entrega. */
export async function avaliarEntrega(f: FormData) {
  await soGestor();
  const extra = t(f, "extra");
  const criador = t(f, "criador");
  const aprovar = f.get("aprovar") === "1";
  const admin = supabaseAdmin();
  const { data: ex } = await admin.from("extras").select("titulo, valor_centavos").eq("id", extra).maybeSingle();
  if (!ex) irPara(`/gestor/extras?erro=${encodeURIComponent("Extra não encontrado.")}`);
  const motivo = t(f, "motivo").slice(0, 200);
  await admin.from("entregas_extra").update(aprovar
    ? { status: "aprovado", aprovado_em: new Date().toISOString(), mes: mesDe(hojeBrasil()), motivo: "" }
    : { status: "recusado", aprovado_em: null, mes: null, motivo }).eq("extra_id", extra).eq("criador_id", criador);
  await notificar(criador, aprovar
    ? { tipo: "pagamento", titulo: `Extra aprovado: +${formatarReais(ex!.valor_centavos)} 💸`, texto: `${ex!.titulo}. O valor entrou no seu total do mês.`, link: "/", chave: `extra:ok:${extra}:${criador}:${Date.now()}` }
    : { tipo: "pagamento", titulo: "Vídeo extra não aprovado", texto: `${ex!.titulo}.${motivo ? ` Motivo: ${motivo}.` : ""} Você pode mandar outro link até o prazo.`, link: "/dias#extras", chave: `extra:nao:${extra}:${criador}:${Date.now()}` }, admin).catch(() => undefined);
  irPara(`/gestor/extras?ok=${encodeURIComponent(aprovar ? "Aprovado: o valor entrou no total do mês do criador." : "Recusado. O criador foi avisado.")}`);
}
