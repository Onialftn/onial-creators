"use server";
import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/dados";

/** Marca todos os avisos do usuário como lidos. */
export async function marcarLidas() {
  const { sb, perfil } = await usuarioAtual();
  await sb.from("notificacoes").update({ lida: true }).eq("criador_id", perfil.id).eq("lida", false);
  revalidatePath("/", "layout");
}
