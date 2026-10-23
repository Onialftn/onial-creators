"use server";
import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/dados";
import { hojeBrasil } from "@/lib/datas";
import { DURACOES, HORARIOS, MAX_AJUDANTES, faixaHorario, inicioDe, situacao, type Pedido } from "@/lib/gravar";
import { MAPAS } from "@/lib/ia/mapas";
import { notificar } from "@/lib/notificacoes";
import { formatarReais, BONUS_AJUDA_CENTAVOS } from "@/lib/pagamento";
import { supabaseAdmin } from "@/lib/supabase/server";

type Retorno = { ok?: string; erro?: string };
const primeiro = (nome: string) => nome.split(" ")[0];
const diaBr = (dia: string) => dia.split("-").reverse().slice(0, 2).join("/");
const nomeMapa = (id: string) => MAPAS.find((m) => m.id === id)?.nome ?? id;
const atualizar = () => { revalidatePath("/gravar"); revalidatePath("/", "layout"); };

async function carregar(id: string) {
  const admin = supabaseAdmin();
  const [{ data: p }, { data: ajudas }] = await Promise.all([
    admin.from("pedidos_ajuda").select("*").eq("id", id).maybeSingle(),
    admin.from("ajudas").select("pedido_id, ajudante_id, presente").eq("pedido_id", id),
  ]);
  return { admin, p: p as (Pedido & { dia: string }) | null, ajudas: ajudas ?? [] };
}

export async function pedirAjuda(d: { dia: string; hora: string; duracao: number; vagas: number; mapa: string; descricao: string }): Promise<Retorno> {
  const { perfil } = await usuarioAtual();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dia) || d.dia < hojeBrasil()) return { erro: "Escolha um dia de hoje em diante." };
  if (!HORARIOS.includes(d.hora)) return { erro: "Escolha o horário." };
  if (!DURACOES.includes(Number(d.duracao))) return { erro: "Escolha a duração." };
  const vagas = Math.floor(Number(d.vagas));
  if (!(vagas >= 1 && vagas <= MAX_AJUDANTES)) return { erro: `Escolha de 1 a ${MAX_AJUDANTES} pessoas.` };
  if (!MAPAS.some((m) => m.id === d.mapa)) return { erro: "Escolha o mapa." };
  const descricao = String(d.descricao ?? "").trim().slice(0, 500);
  if (descricao.length < 5) return { erro: "Conte em uma frase o que vai gravar." };
  if (inicioDe({ dia: d.dia, hora: d.hora }) <= new Date()) return { erro: "Esse horário já passou." };
  const admin = supabaseAdmin();
  const { data: novo, error } = await admin.from("pedidos_ajuda").insert({ criador_id: perfil.id, dia: d.dia, hora: d.hora, duracao_min: Number(d.duracao), vagas, mapa: d.mapa, descricao }).select("id").single();
  if (error || !novo) return { erro: "Não consegui salvar o pedido. Tente de novo." };
  const { data: equipe } = await admin.from("perfis").select("id").neq("id", perfil.id);
  await Promise.all((equipe ?? []).map((e) => notificar(e.id, {
    tipo: "ajuda", titulo: `${primeiro(perfil.nome)} precisa de ajuda para gravar 🎬`,
    texto: `${diaBr(d.dia)}, ${faixaHorario(d.hora, Number(d.duracao))} · ${nomeMapa(d.mapa)}. Ajude e ganhe ${formatarReais(BONUS_AJUDA_CENTAVOS)}.`,
    link: `/gravar?dia=${d.dia}`, chave: `ajuda:novo:${novo.id}`,
  }, admin).catch(() => undefined)));
  atualizar();
  return { ok: "Pedido criado! A equipe foi avisada." };
}

export async function aceitarAjuda(id: string): Promise<Retorno> {
  const { perfil } = await usuarioAtual();
  const { admin, p, ajudas } = await carregar(id);
  if (!p) return { erro: "Esse pedido não existe mais." };
  if (p.criador_id === perfil.id) return { erro: "Esse pedido é seu." };
  if (ajudas.some((a) => a.ajudante_id === perfil.id)) return { erro: "Você já aceitou esse pedido." };
  if (situacao(p, ajudas.length) !== "aberto") return { erro: "Esse pedido não está mais aberto (lotou ou já começou)." };
  const { error } = await admin.from("ajudas").insert({ pedido_id: id, ajudante_id: perfil.id });
  if (error) return { erro: "Não consegui aceitar. Tente de novo." };
  await notificar(p.criador_id, { tipo: "ajuda", titulo: `${primeiro(perfil.nome)} vai te ajudar a gravar 🤝`, texto: `${diaBr(p.dia)}, ${faixaHorario(p.hora, p.duracao_min)}. ${ajudas.length + 1} de ${p.vagas} ${p.vagas === 1 ? "pessoa" : "pessoas"}.`, link: `/gravar?dia=${p.dia}`, chave: `ajuda:aceitou:${id}:${perfil.id}` }, admin).catch(() => undefined);
  atualizar();
  return { ok: "Combinado! Você vai ajudar nessa gravação." };
}

export async function desistirAjuda(id: string): Promise<Retorno> {
  const { perfil } = await usuarioAtual();
  const { admin, p } = await carregar(id);
  if (!p) return { erro: "Esse pedido não existe mais." };
  if (p.status !== "aberto" || inicioDe(p) <= new Date()) return { erro: "A gravação já começou: fale com quem pediu." };
  await admin.from("ajudas").delete().eq("pedido_id", id).eq("ajudante_id", perfil.id);
  await notificar(p.criador_id, { tipo: "ajuda", titulo: `${primeiro(perfil.nome)} não vai mais poder ajudar`, texto: `Na gravação de ${diaBr(p.dia)}, ${faixaHorario(p.hora, p.duracao_min)}. A vaga abriu de novo.`, link: `/gravar?dia=${p.dia}`, chave: `ajuda:desistiu:${id}:${perfil.id}:${Date.now()}` }, admin).catch(() => undefined);
  atualizar();
  return { ok: "Você saiu dessa gravação." };
}

export async function cancelarPedido(id: string): Promise<Retorno> {
  const { perfil } = await usuarioAtual();
  const { admin, p, ajudas } = await carregar(id);
  if (!p) return { erro: "Esse pedido não existe mais." };
  if (p.criador_id !== perfil.id && perfil.papel !== "gestor") return { erro: "Só quem pediu pode cancelar." };
  if (p.status === "feito") return { erro: "Essa gravação já foi confirmada." };
  await admin.from("pedidos_ajuda").update({ status: "cancelado" }).eq("id", id);
  await Promise.all(ajudas.map((a) => notificar(a.ajudante_id, { tipo: "ajuda", titulo: "Gravação cancelada", texto: `A gravação de ${diaBr(p.dia)}, ${faixaHorario(p.hora, p.duracao_min)} foi cancelada.`, link: `/gravar?dia=${p.dia}`, chave: `ajuda:cancelado:${id}` }, admin).catch(() => undefined)));
  atualizar();
  return { ok: "Pedido cancelado." };
}

/** Quem pediu (ou o gestor) confirma a gravação e marca quem apareceu: cada presente ganha o bônus. */
export async function confirmarGravacao(id: string, presentes: string[]): Promise<Retorno> {
  const { perfil } = await usuarioAtual();
  const { admin, p, ajudas } = await carregar(id);
  if (!p) return { erro: "Esse pedido não existe mais." };
  if (p.criador_id !== perfil.id && perfil.papel !== "gestor") return { erro: "Só quem pediu pode confirmar." };
  if (p.status === "cancelado") return { erro: "Esse pedido foi cancelado." };
  if (inicioDe(p) > new Date()) return { erro: "Dá para confirmar só depois que a gravação começar." };
  const { data: fechado } = await admin.from("pagamentos").select("id").eq("mes", p.dia.slice(0, 7)).in("criador_id", ajudas.map((a) => a.ajudante_id)).limit(1);
  if (fechado?.length && perfil.papel !== "gestor") return { erro: "O mês dessa gravação já foi fechado. Fale com o gestor." };
  for (const a of ajudas) await admin.from("ajudas").update({ presente: presentes.includes(a.ajudante_id) }).eq("pedido_id", id).eq("ajudante_id", a.ajudante_id);
  await admin.from("pedidos_ajuda").update({ status: "feito", confirmado_em: new Date().toISOString() }).eq("id", id);
  await Promise.all(ajudas.filter((a) => presentes.includes(a.ajudante_id)).map((a) => notificar(a.ajudante_id, { tipo: "pagamento", titulo: `+${formatarReais(BONUS_AJUDA_CENTAVOS)} pela ajuda na gravação 💸`, texto: `${primeiro(perfil.nome)} confirmou a gravação de ${diaBr(p.dia)}. O bônus entrou no seu total do mês.`, link: "/", chave: `ajuda:bonus:${id}` }, admin).catch(() => undefined)));
  atualizar();
  return { ok: presentes.length ? "Gravação confirmada! O bônus entrou para quem ajudou." : "Gravação confirmada (ninguém marcado como presente)." };
}
