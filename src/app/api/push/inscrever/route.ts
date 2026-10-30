import { NextResponse, type NextRequest } from "next/server";
import { notificar } from "@/lib/notificacoes";
import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/server";

/** Guarda a inscrição deste celular/navegador para receber avisos (POST) ou tira (DELETE). */
export async function POST(req: NextRequest) {
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Entre de novo no site." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!b.endpoint?.startsWith("https://") || !b.keys?.p256dh || !b.keys?.auth) return NextResponse.json({ erro: "Inscrição inválida." }, { status: 400 });
  await supabaseAdmin().from("push_inscricoes").upsert({ endpoint: b.endpoint, criador_id: user.id, p256dh: b.keys.p256dh, auth: b.keys.auth });
  await notificar(user.id, { tipo: "boas-vindas", titulo: "Notificações ligadas ✅", texto: "Tudo certo por aqui.", link: "/", chave: `push-ok:${b.endpoint.slice(-24)}` });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sb = await supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (b.endpoint) await supabaseAdmin().from("push_inscricoes").delete().eq("endpoint", b.endpoint).eq("criador_id", user.id);
  return NextResponse.json({ ok: true });
}
