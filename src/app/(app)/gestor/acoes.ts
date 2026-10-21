"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import { supabaseAdmin } from "@/lib/supabase/server";
import { coletarTodas } from "@/lib/coleta/coletar";

async function gestor() {
  const ctx = await usuarioAtual();
  if (ctx.perfil.papel !== "gestor") throw new Error("Só o gestor pode fazer isso.");
  return ctx;
}
const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const inteiro = (f: FormData, k: string) => Math.max(0, Math.floor(Number(texto(f, k).replace(/\D/g, "")) || 0));
function voltar(criadorId: string, aviso: string) {
  revalidatePath("/", "layout");
  redirect(`/gestor?c=${criadorId}&ok=${encodeURIComponent(aviso)}`);
}

export async function criarCriador(f: FormData) {
  const { sb } = await gestor();
  const nome = texto(f, "nome");
  const email = texto(f, "email").toLowerCase();
  const senha = texto(f, "senha");
  if (!nome || !email || senha.length < 8) redirect(`/gestor?erro=${encodeURIComponent("Preencha nome, e-mail e uma senha com pelo menos 8 caracteres.")}`);
  const { data, error } = await supabaseAdmin().auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
  if (error || !data.user) redirect(`/gestor?erro=${encodeURIComponent(error?.message.includes("already") ? "Esse e-mail já tem cadastro." : "Não consegui criar o criador. Tente de novo.")}`);
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
  voltar(criador, "Views lançadas.");
}

export async function fecharMes(f: FormData) {
  const { sb } = await gestor();
  const criador = texto(f, "criador");
  const mes = texto(f, "mes");
  const r = await resumoDoMes(sb, criador, mes);
  const p = r.pagamento;
  await sb.from("pagamentos").upsert(
    { criador_id: criador, mes, views: p.views, faltas: p.faltas, bruto_centavos: p.brutoCentavos, constancia_centavos: p.constanciaCentavos, bonus_meta_centavos: p.bonusMetaCentavos, total_centavos: p.totalCentavos, status: "em_aberto" },
    { onConflict: "criador_id,mes" },
  );
  voltar(criador, "Mês fechado. O valor aparece em Pagamentos como A pagar.");
}

export async function marcarPago(f: FormData) {
  const { sb } = await gestor();
  const criador = texto(f, "criador");
  await sb.from("pagamentos").update({ status: "pago", pago_em: new Date().toISOString() }).eq("id", texto(f, "pagamento"));
  voltar(criador, "Pagamento marcado como pago.");
}

export async function coletarAgora() {
  await gestor();
  const r = await coletarTodas(true);
  const falhas = r.filter((x) => !x.ok).length;
  revalidatePath("/", "layout");
  redirect(`/gestor?ok=${encodeURIComponent(r.length === 0 ? "Nenhuma conta conectada ainda." : `Coleta feita em ${r.length} contas${falhas ? `, ${falhas} com problema` : ""}.`)}`);
}
