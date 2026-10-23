"use server";
import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/dados";

/** Marca como lidas as notificações escolhidas (ou todas). */
export async function marcarLidas(ids?: string[]) {
  const { sb, perfil } = await usuarioAtual();
  let q = sb.from("notificacoes").update({ lida: true }).eq("criador_id", perfil.id).eq("lida", false);
  if (ids?.length) q = q.in("id", ids.slice(0, 100));
  await q;
  revalidatePath("/", "layout");
}

/** Tira do painel as notificações escolhidas (ou todas). */
export async function limparNotificacoes(ids?: string[]) {
  const { sb, perfil } = await usuarioAtual();
  let q = sb.from("notificacoes").update({ oculta: true, lida: true }).eq("criador_id", perfil.id).eq("oculta", false);
  if (ids?.length) q = q.in("id", ids.slice(0, 100));
  await q;
  revalidatePath("/", "layout");
}
