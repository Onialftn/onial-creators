import { NextResponse } from "next/server";
import { videosDoMeuCanal } from "@/lib/seo-canal";
import { melhoresHorarios } from "@/lib/seo-regras";
import { supabaseServidor } from "@/lib/supabase/server";

export const maxDuration = 30;

/** Melhores horários e dias para postar, pelos vídeos do próprio canal do YouTube. */
export async function GET() {
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Entre de novo no site." }, { status: 401 });
  try {
    const videos = await videosDoMeuCanal(user.id);
    if (!videos) return NextResponse.json({ erro: "Conecte seu YouTube em Minhas redes para ver os melhores horários do seu canal." }, { status: 400 });
    return NextResponse.json(melhoresHorarios(videos));
  } catch {
    return NextResponse.json({ erro: "Não deu para ler seu canal agora. Tente de novo mais tarde." }, { status: 502 });
  }
}
