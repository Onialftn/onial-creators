import "server-only";

/** Gemini (Google) assiste um vídeo PÚBLICO do YouTube pelo link e devolve o que é falado. */
const MODELO_GEMINI = "gemini-3.8-flash";

export function geminiConfigurado() {
  return !!process.env.GEMINI_API_KEY?.trim();
}

export async function transcreverYoutube(videoId: string): Promise<string> {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) throw new Error("A transcrição automática ainda não foi configurada.");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": chave },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Transcreva exatamente o que é falado neste vídeo, no idioma original, sem traduzir, sem resumir e sem comentar. Uma frase por linha. Não escreva tempos nem nomes de quem fala. Se o vídeo não tiver fala, responda apenas: SEM FALA" },
          { file_data: { file_uri: `https://www.youtube.com/watch?v=${videoId}` } },
        ],
      }],
    }),
  });
  const corpo = await r.text();
  if (!r.ok) {
    console.error("Gemini", r.status, corpo.slice(0, 400));
    let motivo = "";
    try { const e = JSON.parse(corpo) as { error?: { status?: string; message?: string } }; motivo = `${e.error?.status ?? r.status}: ${e.error?.message ?? ""}`.replace(/(AIza|AQ\.)[\w.-]+/g, "[chave]").slice(0, 200); } catch { motivo = String(r.status); }
    throw new Error(r.status === 429 ? "A transcrição automática atingiu o limite de hoje." : `Não consegui transcrever esse vídeo automaticamente (Google: ${motivo}).`);
  }
  const d = JSON.parse(corpo) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const texto = (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!texto || /^SEM FALA/i.test(texto)) throw new Error("Esse vídeo não tem fala para traduzir.");
  return texto;
}
