import { NextResponse, type NextRequest } from "next/server";
import { TAMANHO_MAX, TAMANHO_PARTE, TIPOS_VIDEO, partesDe } from "@/lib/avaliar-regras";
import { apagarVideo, avaliarVideo, enviarVideo, esperarPronto } from "@/lib/ia/avaliar";
import { registrarUso } from "@/lib/ia/uso";
import { supabaseAdmin } from "@/lib/supabase/server";
import { BALDE, limparPasta, quemPede } from "../comum";

export const maxDuration = 300;

/** Manda o vídeo enviado para a IA, guarda a avaliação e apaga o vídeo. */
export async function POST(req: NextRequest) {
  const q = await quemPede();
  if ("erro" in q) return NextResponse.json({ erro: q.erro }, { status: q.status });
  const b = (await req.json().catch(() => ({}))) as { id?: string; tamanho?: number; tipo?: string; nome?: string };
  const id = String(b.id ?? "");
  const tamanho = Number(b.tamanho);
  const tipo = String(b.tipo);
  if (!/^[0-9a-f-]{36}$/.test(id) || !TIPOS_VIDEO.includes(tipo) || !(tamanho > 0) || tamanho > TAMANHO_MAX) return NextResponse.json({ erro: "Envio inválido. Escolha o vídeo de novo." }, { status: 400 });
  const admin = supabaseAdmin();
  const st = admin.storage.from(BALDE);
  let arquivo: { name: string; uri: string } | null = null;
  try {
    async function* partes() {
      for (let i = 0; i < partesDe(tamanho); i++) {
        const { data, error } = await st.download(`${q.id}/${id}/${i}`);
        if (error || !data) throw new Error("Uma parte do vídeo não chegou. Envie de novo.");
        const bytes = new Uint8Array(await data.arrayBuffer());
        if (bytes.byteLength !== Math.min(TAMANHO_PARTE, tamanho - i * TAMANHO_PARTE)) throw new Error("O vídeo chegou incompleto. Envie de novo.");
        yield bytes;
      }
    }
    arquivo = await enviarVideo(partes(), tamanho, tipo);
    await limparPasta(q.id, id).catch(() => {});
    await esperarPronto(arquivo.name);
    const r = await avaliarVideo(arquivo.uri, tipo);
    const { data: salvo } = await admin.from("avaliacoes").insert({ criador_id: q.id, arquivo: String(b.nome ?? "").slice(0, 120), nota: r.dados.nota, resultado: r.dados }).select("id, criado_em").single();
    await registrarUso(q.id, "avaliacao", r);
    return NextResponse.json({ avaliacao: r.dados, id: salvo?.id, criado_em: salvo?.criado_em, usados: q.usados + 1 });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "A IA não conseguiu avaliar agora. Tente de novo." }, { status: 502 });
  } finally {
    await limparPasta(q.id, id).catch(() => {});
    if (arquivo) await apagarVideo(arquivo.name);
  }
}
