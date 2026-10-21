import { NextResponse, type NextRequest } from "next/server";
import { coletarConta } from "@/lib/coleta/coletar";
import { NOME_REDE, REDE, REDES, type Rede } from "@/lib/coleta/redes";
import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/server";

/** A rede devolve o criador para cá depois que ele autoriza. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ rede: string }> }) {
  const { rede: r } = await params;
  const volta = new URL("/redes", request.url);
  const falhar = (msg: string) => {
    volta.searchParams.set("erro", msg);
    const res = NextResponse.redirect(volta);
    res.cookies.delete(`oauth_${r}`);
    return res;
  };
  if (!REDES.includes(r as Rede)) return NextResponse.redirect(volta);
  const rede = r as Rede;
  const q = request.nextUrl.searchParams;
  if (q.get("error")) return falhar(`Conexão com o ${NOME_REDE[rede]} cancelada.`);
  const code = q.get("code");
  const state = q.get("state");
  if (!code || !state || state !== request.cookies.get(`oauth_${rede}`)?.value) return falhar("A conexão expirou. Tente de novo.");

  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const redirect = `${request.nextUrl.origin}/api/conectar/${rede}/callback`;
    const tokens = await REDE[rede].trocar(code, redirect);
    const perfil = await REDE[rede].perfil(tokens);
    const admin = supabaseAdmin();
    const { data: conta, error } = await admin
      .from("contas_plataforma")
      .upsert({ criador_id: user.id, plataforma: rede, conta_externa_id: perfil.contaExternaId, nome_conta: perfil.nome, foto_url: perfil.foto, conectado_em: new Date().toISOString(), erro: null }, { onConflict: "criador_id,plataforma" })
      .select("id")
      .single();
    if (error || !conta) throw new Error(error?.message ?? "sem conta");
    await admin.from("tokens_plataforma").upsert({ conta_id: conta.id, access_token: tokens.access, refresh_token: tokens.refresh, expira_em: tokens.expiraEm?.toISOString() ?? null });
    if (rede === "youtube") await admin.from("perfis").update({ foto_url: perfil.foto, canal_youtube: perfil.nome }).eq("id", user.id);
    // primeira coleta já na hora (o ponto de partida dos totais)
    await coletarConta(conta.id).catch(() => undefined);
    volta.searchParams.set("ok", `${NOME_REDE[rede]} conectado: ${perfil.nome}`);
    const res = NextResponse.redirect(volta);
    res.cookies.delete(`oauth_${rede}`);
    return res;
  } catch (e) {
    console.error("conectar", rede, e);
    return falhar(`Não consegui conectar o ${NOME_REDE[rede]}. ${e instanceof Error && e.message.includes("canal") ? e.message : "Tente de novo ou fale com o gestor."}`);
  }
}
