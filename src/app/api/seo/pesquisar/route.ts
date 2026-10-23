import { NextResponse, type NextRequest } from "next/server";
import { pesquisarPalavra } from "@/lib/seo-pesquisa";
import { supabaseServidor } from "@/lib/supabase/server";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Entre de novo no site." }, { status: 401 });
  const termo = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (termo.length < 3) return NextResponse.json({ erro: "Digite uma palavra-chave (ex.: farm de xp fortnite)." }, { status: 400 });
  try {
    return NextResponse.json(await pesquisarPalavra(termo));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    console.error("seo pesquisa", msg.slice(0, 300));
    return NextResponse.json({ erro: /quota/i.test(msg) ? "A cota diária do YouTube acabou. Tente de novo amanhã." : "Não consegui pesquisar no YouTube agora. Tente de novo." }, { status: 502 });
  }
}
