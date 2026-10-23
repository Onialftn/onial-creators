import { NextResponse, type NextRequest } from "next/server";
import { MAPAS } from "@/lib/ia/mapas";
import { gerarSeo } from "@/lib/ia/seo";
import { LIMITE_MES, registrarUso, usadosNoMes } from "@/lib/ia/uso";
import { supabaseServidor } from "@/lib/supabase/server";

export const maxDuration = 60;

/** Gera títulos, descrições e hashtags para YouTube, TikTok e Instagram. */
export async function POST(req: NextRequest) {
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Entre de novo no site." }, { status: 401 });
  const { data: perfil } = await sb.from("perfis").select("papel").eq("id", user.id).single();
  const b = (await req.json().catch(() => ({}))) as { mapa?: string; tema?: string; assunto?: string };
  const mapa = MAPAS.find((m) => m.id === b.mapa);
  const tema = mapa?.temas.find((t) => t === b.tema) ?? mapa?.temas[0];
  const assunto = String(b.assunto ?? "").trim();
  if (!mapa || !tema) return NextResponse.json({ erro: "Escolha o mapa." }, { status: 400 });
  if (assunto.length < 15) return NextResponse.json({ erro: "Conte em uma ou duas frases do que é o vídeo (ou cole o roteiro)." }, { status: 400 });
  if (assunto.length > 6000) return NextResponse.json({ erro: "O texto está grande demais. Resuma ou cole só o roteiro." }, { status: 400 });

  const usados = await usadosNoMes(user.id, "seo");
  if (perfil?.papel !== "gestor" && usados >= LIMITE_MES.seo)
    return NextResponse.json({ erro: `Você já usou os ${LIMITE_MES.seo} pedidos de SEO deste mês. Fale com o gestor se precisar de mais.` }, { status: 429 });
  try {
    const r = await gerarSeo({ mapa: mapa.nome, tema, assunto });
    await registrarUso(user.id, "seo", r);
    return NextResponse.json({ seo: r.dados, usados: usados + 1, limite: LIMITE_MES.seo });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "A IA não respondeu. Tente de novo." }, { status: 502 });
  }
}
