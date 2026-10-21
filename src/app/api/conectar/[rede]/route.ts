import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { REDE, REDES, redeConfigurada, type Rede } from "@/lib/coleta/redes";
import { supabaseServidor } from "@/lib/supabase/server";

/** Começa a conexão: manda o criador para a tela de autorização da rede. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ rede: string }> }) {
  const { rede } = await params;
  const volta = new URL("/redes", request.url);
  if (!REDES.includes(rede as Rede)) return NextResponse.redirect(volta);
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!redeConfigurada(rede as Rede)) {
    volta.searchParams.set("erro", "Essa rede ainda não foi configurada pelo gestor.");
    return NextResponse.redirect(volta);
  }
  const state = randomBytes(16).toString("hex");
  const redirect = `${request.nextUrl.origin}/api/conectar/${rede}/callback`;
  const res = NextResponse.redirect(REDE[rede as Rede].autorizar(redirect, state));
  res.cookies.set(`oauth_${rede}`, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
