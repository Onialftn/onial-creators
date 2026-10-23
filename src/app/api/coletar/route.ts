import { NextResponse, type NextRequest } from "next/server";
import { coletarTodas } from "@/lib/coleta/coletar";
import { gerarNotificacoes } from "@/lib/notificacoes";

export const maxDuration = 300;

/** Chamado todo dia pela Vercel (vercel.json → crons). Protegido pelo CRON_SECRET. */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const resultado = await coletarTodas();
  // avisos do dia (dia de postar, meta, vídeo bombando, ranking...) logo depois da coleta das 6h
  const avisos = await gerarNotificacoes().catch((e) => { console.error("avisos", e); return 0; });
  return NextResponse.json({ ok: true, resultado, avisos });
}
