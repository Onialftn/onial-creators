"use server";
import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/dados";
import type { VideoRef } from "@/lib/ideias";

/** Guarda só os campos do vídeo que a aba Curtidos mostra (e com tamanho limitado). */
function limpar(v: VideoRef): VideoRef {
  const num = (x: unknown) => (Number.isFinite(Number(x)) ? Math.max(0, Math.floor(Number(x))) : 0);
  return {
    id: String(v.id).slice(0, 20),
    titulo: String(v.titulo ?? "").slice(0, 200),
    canal: String(v.canal ?? "").slice(0, 100),
    publicado: String(v.publicado ?? "").slice(0, 40),
    views: num(v.views),
    likes: v.likes == null ? null : num(v.likes),
    comentarios: v.comentarios == null ? null : num(v.comentarios),
    capa: /^https:\/\/i\d?\.ytimg\.com\//.test(String(v.capa)) ? String(v.capa).slice(0, 300) : `https://i.ytimg.com/vi/${String(v.id).slice(0, 20)}/hqdefault.jpg`,
    segundos: num(v.segundos),
  };
}

/** Curte ou descurte um vídeo da aba Ideias & roteiros. Devolve se ficou curtido. */
export async function alternarCurtido(v: VideoRef, curtir: boolean): Promise<{ curtido: boolean; erro?: string }> {
  const { sb, perfil } = await usuarioAtual();
  if (!/^[\w-]{6,20}$/.test(String(v?.id))) return { curtido: !curtir, erro: "Vídeo inválido." };
  const { error } = curtir
    ? await sb.from("curtidos").upsert({ criador_id: perfil.id, video_id: v.id, video: limpar(v) }, { onConflict: "criador_id,video_id", ignoreDuplicates: true })
    : await sb.from("curtidos").delete().eq("criador_id", perfil.id).eq("video_id", v.id);
  if (error) return { curtido: !curtir, erro: "Não consegui salvar agora. Tente de novo." };
  revalidatePath("/ideias");
  return { curtido: curtir };
}
