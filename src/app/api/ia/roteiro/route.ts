import { NextResponse, type NextRequest } from "next/server";
import { DURACOES, MAPAS } from "@/lib/ia/mapas";
import { adaptarRoteiro } from "@/lib/ia/roteiro";
import { LIMITE_MES, registrarUso, usadosNoMes } from "@/lib/ia/uso";
import { supabaseServidor } from "@/lib/supabase/server";

export const maxDuration = 60;

/** Adapta o roteiro gringo para o público brasileiro. */
export async function POST(req: NextRequest) {
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Entre de novo no site." }, { status: 401 });
  const { data: perfil } = await sb.from("perfis").select("papel").eq("id", user.id).single();

  const b = (await req.json().catch(() => ({}))) as { mapa?: string; tema?: string; duracao?: number; original?: string; anterior?: string };
  const mapa = MAPAS.find((m) => m.id === b.mapa);
  const tema = mapa?.temas.find((t) => t === b.tema);
  const duracao = DURACOES.find((d) => d === Number(b.duracao));
  const original = String(b.original ?? "").trim();
  if (!mapa || !tema || !duracao) return NextResponse.json({ erro: "Escolha mapa, tema e duração." }, { status: 400 });
  if (original.length < 30) return NextResponse.json({ erro: "Cole o roteiro do vídeo gringo (pelo menos uma ou duas frases)." }, { status: 400 });
  if (original.length > 6000) return NextResponse.json({ erro: "O roteiro está grande demais. Cole só o texto falado do vídeo." }, { status: 400 });

  const usados = await usadosNoMes(user.id, "roteiro");
  if (perfil?.papel !== "gestor" && usados >= LIMITE_MES.roteiro)
    return NextResponse.json({ erro: `Você já usou os ${LIMITE_MES.roteiro} roteiros deste mês. Fale com o gestor se precisar de mais.` }, { status: 429 });

  try {
    const r = await adaptarRoteiro({ mapa: mapa.nome, tema, duracao, original, anterior: b.anterior ? String(b.anterior).slice(0, 4000) : undefined });
    await registrarUso(user.id, "roteiro", r);
    return NextResponse.json({ roteiro: r.dados, usados: usados + 1, limite: LIMITE_MES.roteiro });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "A IA não respondeu. Tente de novo." }, { status: 502 });
  }
}
