import { NextResponse, type NextRequest } from "next/server";
import { completarSeo, sugerirTitulos } from "@/lib/ia/seo";
import { LIMITE_MES, registrarUso, usadosNoMes } from "@/lib/ia/uso";
import { videosDoMeuCanal } from "@/lib/seo-canal";
import { supabaseServidor } from "@/lib/supabase/server";

export const maxDuration = 60;

/** SEO passo a passo: etapa "titulos" (5 sugestões) ou "resto" (descrição, hashtags e tags). */
export async function POST(req: NextRequest) {
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Entre de novo no site." }, { status: 401 });
  const { data: perfil } = await sb.from("perfis").select("papel").eq("id", user.id).single();
  const b = (await req.json().catch(() => ({}))) as { etapa?: string; titulo?: string };
  const titulo = String(b.titulo ?? "").trim().slice(0, 150);
  if (titulo.length < 5) return NextResponse.json({ erro: "Escreva o título (ou a ideia) do vídeo." }, { status: 400 });

  const usados = await usadosNoMes(user.id, "seo");
  if (perfil?.papel !== "gestor" && usados >= LIMITE_MES.seo)
    return NextResponse.json({ erro: `Você já usou os ${LIMITE_MES.seo} pedidos de SEO deste mês. Fale com o gestor se precisar de mais.` }, { status: 429 });
  try {
    if (b.etapa === "titulos") {
      // os títulos que mais deram views no canal do próprio criador entram como exemplo
      const meus = await videosDoMeuCanal(user.id).catch(() => null);
      const meusVirais = (meus ?? []).sort((a, c) => c.views - a.views).slice(0, 10).map((v) => v.titulo);
      const r = await sugerirTitulos({ titulo, meusVirais });
      await registrarUso(user.id, "seo", r);
      return NextResponse.json({ titulos: r.dados.titulos, usados: usados + 1 });
    }
    const r = await completarSeo({ titulo });
    await registrarUso(user.id, "seo", r);
    return NextResponse.json({ ...r.dados, usados: usados + 1 });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "A IA não respondeu. Tente de novo." }, { status: 502 });
  }
}
