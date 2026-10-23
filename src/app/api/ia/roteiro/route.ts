import { NextResponse, type NextRequest } from "next/server";
import { MAPAS } from "@/lib/ia/mapas";
import { traduzirRoteiro } from "@/lib/ia/roteiro";
import { LIMITE_MES, registrarUso, usadosNoMes } from "@/lib/ia/uso";
import { supabaseServidor } from "@/lib/supabase/server";

export const maxDuration = 60;

/** Traduz o roteiro gringo para o português e troca o mapa citado pelo mapa da Onial. */
export async function POST(req: NextRequest) {
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Entre de novo no site." }, { status: 401 });
  const { data: perfil } = await sb.from("perfis").select("papel").eq("id", user.id).single();

  const b = (await req.json().catch(() => ({}))) as { mapa?: string; original?: string; anterior?: string };
  const mapa = MAPAS.find((m) => m.id === b.mapa);
  const original = String(b.original ?? "").trim();
  if (!mapa) return NextResponse.json({ erro: "Escolha o mapa." }, { status: 400 });
  if (original.length < 30) return NextResponse.json({ erro: "Cole o roteiro do vídeo gringo (pelo menos uma ou duas frases)." }, { status: 400 });
  if (original.length > 6000) return NextResponse.json({ erro: "O roteiro está grande demais. Cole só o texto falado do vídeo." }, { status: 400 });

  const usados = await usadosNoMes(user.id, "roteiro");
  if (perfil?.papel !== "gestor" && usados >= LIMITE_MES.roteiro)
    return NextResponse.json({ erro: `Você já usou os ${LIMITE_MES.roteiro} roteiros deste mês. Fale com o gestor se precisar de mais.` }, { status: 429 });

  try {
    const r = await traduzirRoteiro({ mapa: mapa.falado, original, anterior: b.anterior ? String(b.anterior).slice(0, 6000) : undefined });
    await registrarUso(user.id, "roteiro", r);
    return NextResponse.json({ roteiro: r.dados, usados: usados + 1, limite: LIMITE_MES.roteiro });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "A IA não respondeu. Tente de novo." }, { status: 502 });
  }
}
