import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { TAMANHO_MAX, TIPOS_VIDEO, partesDe } from "@/lib/avaliar-regras";
import { supabaseAdmin } from "@/lib/supabase/server";
import { BALDE, limparPasta, quemPede } from "../comum";

/** Prepara o envio do vídeo: devolve um endereço de envio para cada parte. */
export async function POST(req: NextRequest) {
  const q = await quemPede();
  if ("erro" in q) return NextResponse.json({ erro: q.erro }, { status: q.status });
  const b = (await req.json().catch(() => ({}))) as { tamanho?: number; tipo?: string };
  const tamanho = Number(b.tamanho);
  if (!TIPOS_VIDEO.includes(String(b.tipo))) return NextResponse.json({ erro: "Envie um vídeo em MP4, MOV ou WEBM." }, { status: 400 });
  if (!(tamanho > 0) || tamanho > TAMANHO_MAX) return NextResponse.json({ erro: "O vídeo precisa ter até 400 MB." }, { status: 400 });
  await limparPasta(q.id).catch(() => {});
  const id = randomUUID();
  const st = supabaseAdmin().storage.from(BALDE);
  const partes = [];
  for (let i = 0; i < partesDe(tamanho); i++) {
    const { data, error } = await st.createSignedUploadUrl(`${q.id}/${id}/${i}`);
    if (error || !data) return NextResponse.json({ erro: "Não consegui preparar o envio. Tente de novo." }, { status: 500 });
    partes.push({ caminho: data.path, token: data.token });
  }
  return NextResponse.json({ id, partes });
}
