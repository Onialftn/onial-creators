import { NextResponse, type NextRequest } from "next/server";
import { coletarTodas } from "@/lib/coleta/coletar";

export const maxDuration = 300;

/** Chamado todo dia pela Vercel (vercel.json → crons). Protegido pelo CRON_SECRET. */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  const resultado = await coletarTodas();
  return NextResponse.json({ ok: true, resultado });
}
