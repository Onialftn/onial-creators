"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import { supabaseAdmin } from "@/lib/supabase/server";
import { anotarSaldo, coletarTodas } from "@/lib/coleta/coletar";
import { MAPAS } from "@/lib/ia/mapas";
import { resolverCanal } from "@/lib/ideias";
import { gerarNotificacoes, notificar } from "@/lib/notificacoes";
import { formatarReais } from "@/lib/pagamento";
import { nomeMes } from "@/lib/datas";

async function gestor() {
  const ctx = await usuarioAtual();
  if (ctx.perfil.papel !== "gestor") throw new Error("Só o gestor pode fazer isso.");
  return ctx;
}
const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const inteiro = (f: FormData, k: string) => Math.max(0, Math.floor(Number(texto(f, k).replace(/\D/g, "")) || 0));
function voltar(criadorId: string, aviso: string) {
  revalidatePath("/", "layout");
  redirect(`/gestor/criador/${criadorId}?ok=${encodeURIComponent(aviso)}`);
}

export async function criarCriador(f: FormData) {
  const { sb } = await gestor();
  const nome = texto(f, "nome");
  const email = texto(f, "email").toLowerCase();
  const senha = texto(f, "senha");
  if (!nome || !email || senha.length < 8) redirect(`/gestor/config?erro=${encodeURIComponent("Preencha nome, e-mail e uma senha com pelo menos 8 caracteres.")}`);
  const { data, error } = await supabaseAdmin().auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
  if (error || !data.user) redirect(`/gestor/config?erro=${encodeURIComponent(error?.message.includes("already") ? "Esse e-mail já tem cadastro." : "Não consegui criar o criador. Tente de novo.")}`);
  const id = data.user!.id;
  await sb.from("perfis").update({ nome }).eq("id", id);
  // padrão: segunda a sexta
  await sb.from("agenda_postagem").insert([1, 2, 3, 4, 5].map((d) => ({ criador_id: id, dia_semana: d })));
  voltar(id, `${nome} cadastrado. Envie o e-mail e a senha para ele entrar.`);
}

export async function salvarMeta(f: FormData) {
  const { sb } = await gestor();
  const criador = texto(f, "criador");
  const meta = inteiro(f, "meta");
  if (!meta) voltar(criador, "Digite a meta em views.");
  await sb.from("metas").upsert({ criador_id: criador, mes: texto(f, "mes"), meta_views: meta });
  voltar(criador, "Meta salva.");
}

export async function salvarAgenda(f: FormData) {
  const { sb } = await gestor();
  const criador = texto(f, "criador");
  const dias = f.getAll("dia").map(Number).filter((d) => d >= 1 && d <= 7);
  if (dias.length !== 5) voltar(criador, `Escolha exatamente 5 dias de postagem (você marcou ${dias.length}).`);
  await sb.from("agenda_postagem").delete().eq("criador_id", criador);
  await sb.from("agenda_postagem").insert(dias.map((d) => ({ criador_id: criador, dia_semana: d })));
  voltar(criador, "Dias de postagem salvos.");
}

export async function registrarDia(f: FormData) {
  const { sb } = await gestor();
  const criador = texto(f, "criador");
  const dia = texto(f, "dia");
  await sb.from("dias_postagem").upsert({ criador_id: criador, dia, postagens: inteiro(f, "postagens") });
  voltar(criador, "Dia registrado.");
}

export async function lancarViews(f: FormData) {
  const { sb } = await gestor();
  const criador = texto(f, "criador");
  const plataforma = texto(f, "plataforma");
  const titulo = texto(f, "titulo");
  const url = texto(f, "url") || null;
  const postado = texto(f, "postado_em");
  const dia = texto(f, "dia");
  const views = inteiro(f, "views");
  if (!["tiktok", "youtube", "instagram"].includes(plataforma) || !titulo || !postado || !dia) voltar(criador, "Preencha plataforma, título, data de postagem e o dia das views.");
  // acha o vídeo pelo link (ou título) ou cria
  let videoId: string | null = null;
  const busca = url ? await sb.from("videos").select("id").eq("criador_id", criador).eq("url", url).maybeSingle() : await sb.from("videos").select("id").eq("criador_id", criador).eq("titulo", titulo).eq("plataforma", plataforma).maybeSingle();
  if (busca.data) videoId = busca.data.id;
  else {
    const novo = await sb.from("videos").insert({ criador_id: criador, plataforma, titulo, url, postado_em: postado, id_externo: url }).select("id").single();
    videoId = novo.data?.id ?? null;
  }
  if (!videoId) voltar(criador, "Não consegui salvar o vídeo. Confira os dados.");
  await sb.from("views_diarias").upsert({ video_id: videoId, dia, criador_id: criador, plataforma, views });
  await anotarSaldo(criador).catch(() => undefined);
  voltar(criador, "Views lançadas.");
}

export async function fecharMes(f: FormData) {
  const { sb } = await gestor();
  const criador = texto(f, "criador");
  const mes = texto(f, "mes");
  const r = await resumoDoMes(sb, criador, mes);
  const p = r.pagamento;
  await sb.from("pagamentos").upsert(
    { criador_id: criador, mes, views: p.views, faltas: p.faltas, bruto_centavos: p.brutoCentavos, constancia_centavos: p.constanciaCentavos, bonus_meta_centavos: p.bonusMetaCentavos, bonus_ajuda_centavos: p.bonusAjudaCentavos, total_centavos: p.totalCentavos, status: "em_aberto" },
    { onConflict: "criador_id,mes" },
  );
  await notificar(criador, { tipo: "pagamento", titulo: `Seu mês de ${nomeMes(mes).split(" ")[0].toLowerCase()} foi fechado`, texto: `Você vai receber ${formatarReais(p.totalCentavos)}. Veja os detalhes em Pagamentos.`, link: "/pagamentos", chave: `fechado:${mes}:${p.totalCentavos}` }).catch(() => undefined);
  voltar(criador, "Mês fechado. O valor aparece em Pagamentos como A pagar.");
}

export async function marcarPago(f: FormData) {
  const { sb } = await gestor();
  const criador = texto(f, "criador");
  const { data: pg } = await sb.from("pagamentos").update({ status: "pago", pago_em: new Date().toISOString() }).eq("id", texto(f, "pagamento")).select("mes, total_centavos").maybeSingle();
  if (pg) await notificar(criador, { tipo: "pagamento", titulo: "Pagamento feito! 💸", texto: `Seu pagamento de ${nomeMes(String(pg.mes)).toLowerCase()} (${formatarReais(Number(pg.total_centavos))}) foi marcado como pago.`, link: "/pagamentos", chave: `pago:${texto(f, "pagamento")}` }).catch(() => undefined);
  voltar(criador, "Pagamento marcado como pago.");
}

export async function coletarAgora() {
  await gestor();
  const r = await coletarTodas(true);
  const falhas = r.filter((x) => !x.ok).length;
  revalidatePath("/", "layout");
  redirect(`/gestor?ok=${encodeURIComponent(r.length === 0 ? "Nenhuma conta conectada ainda." : `Coleta feita em ${r.length} contas${falhas ? `, ${falhas} com problema` : ""}.`)}`);
}

export async function adicionarCanal(f: FormData) {
  const { sb } = await gestor();
  const mapa = MAPAS.find((m) => m.id === texto(f, "mapa"));
  const tema = mapa?.temas.find((t) => t === texto(f, "tema"));
  const volta = (k: "ok" | "erro", m: string) => { revalidatePath("/", "layout"); redirect(`/gestor/config?${k}=${encodeURIComponent(m)}#referencias`); };
  if (!mapa || !tema) volta("erro", "Escolha o mapa e o tema.");
  let canal: Awaited<ReturnType<typeof resolverCanal>>;
  try { canal = await resolverCanal(texto(f, "canal")); } catch (e) { return volta("erro", e instanceof Error ? e.message : "Não achei o canal."); }
  const { error } = await sb.from("canais_referencia").upsert({ mapa: mapa!.id, tema: tema!, ...canal }, { onConflict: "mapa,tema,canal_id" });
  volta(error ? "erro" : "ok", error ? "Não consegui salvar o canal." : `${canal.nome} adicionado em ${tema}.`);
}

export async function removerCanal(f: FormData) {
  const { sb } = await gestor();
  await sb.from("canais_referencia").delete().eq("id", texto(f, "id"));
  revalidatePath("/", "layout");
  redirect("/gestor/config?ok=Canal%20removido.#referencias");
}

export async function salvarMapaSemana(f: FormData) {
  const { sb } = await gestor();
  const criador = texto(f, "criador");
  const semana = texto(f, "semana");
  const mapa = texto(f, "mapa");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) voltar(criador, "Semana inválida.");
  if (!mapa) await sb.from("mapa_semana").delete().eq("criador_id", criador).eq("semana", semana);
  else if (MAPAS.some((m) => m.id === mapa)) await sb.from("mapa_semana").upsert({ criador_id: criador, semana, mapa });
  voltar(criador, "Mapa da semana salvo.");
}

export async function gerarAvisosAgora() {
  await gestor();
  const n = await gerarNotificacoes();
  revalidatePath("/", "layout");
  redirect(`/gestor/config?ok=${encodeURIComponent(n ? `${n} notificações conferidas (as que já existiam não se repetem).` : "Nenhuma notificação para hoje.")}`);
}
