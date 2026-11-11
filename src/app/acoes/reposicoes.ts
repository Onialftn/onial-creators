"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resumoDoMes, usuarioAtual } from "@/lib/dados";
import { hojeBrasil, mesDe } from "@/lib/datas";
import { diaValidoParaRepor, prazoParaRepor } from "@/lib/pagamento";

const diaBr = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
function voltar(k: "ok" | "erro", m: string): never {
  revalidatePath("/", "layout");
  redirect(`/dias?${k}=${encodeURIComponent(m)}#repor`);
}

/** O criador marca o dia em que vai postar o vídeo a mais para repor uma falta (regra nova). Depois de marcado, não muda. */
export async function marcarReposicao(f: FormData) {
  const { sb, perfil } = await usuarioAtual();
  const falta = String(f.get("falta") ?? "");
  const dia = String(f.get("dia") ?? "");
  const hoje = hojeBrasil();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(falta) || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) voltar("erro", "Escolha o dia da reposição.");
  // confere no próprio mês do criador que é mesmo uma falta que ainda pode ser marcada
  const r = await resumoDoMes(sb, perfil.id, mesDe(falta));
  const item = r.faltasParaRepor.find((x) => x.falta === falta);
  if (!item) voltar("erro", "Esse dia não é uma falta.");
  if (item.dia) voltar("erro", `A reposição dessa falta já está marcada para ${diaBr(item.dia)}.`);
  if (item.situacao !== "pode_marcar") voltar("erro", "O prazo para repor essa falta já acabou.");
  if (!diaValidoParaRepor(falta, dia, hoje)) voltar("erro", `Escolha um dia de hoje até ${diaBr(prazoParaRepor(falta))}.`);
  const { error } = await sb.from("reposicoes").insert({ criador_id: perfil.id, falta, dia });
  if (error) voltar("erro", `Não consegui marcar: ${error.message}`);
  voltar("ok", `Reposição marcada para ${diaBr(dia)}. Poste 1 vídeo a mais nesse dia.`);
}
