"use server";
import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/dados";
import type { RoteiroIA } from "@/lib/ia/roteiro";

export async function salvarRoteiro(p: { mapa: string; tema: string; original: string; resultado: RoteiroIA }) {
  const { sb, perfil } = await usuarioAtual();
  const { data, error } = await sb
    .from("roteiros")
    .insert({ criador_id: perfil.id, titulo: (p.resultado.titulo || "Roteiro").slice(0, 120), mapa: p.mapa, tema: p.tema, duracao: 0, original: p.original.slice(0, 6000), resultado: p.resultado })
    .select("id")
    .single();
  if (error) return { erro: "Não consegui salvar. Tente de novo." };
  revalidatePath("/roteiros");
  return { id: data.id as string };
}

export async function apagarRoteiro(id: string) {
  const { sb } = await usuarioAtual();
  await sb.from("roteiros").delete().eq("id", id);
  revalidatePath("/roteiros");
}
