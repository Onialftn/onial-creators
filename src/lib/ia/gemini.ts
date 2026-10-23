import "server-only";

/** Gemini (Google) assiste um vídeo PÚBLICO do YouTube pelo link e devolve o que é falado. */
/** em ordem: se um estiver sobrecarregado (503) ou no limite (429), tenta o próximo */
const MODELOS_GEMINI = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

export function geminiConfigurado() {
  return !!process.env.GEMINI_API_KEY?.trim();
}

export async function transcreverYoutube(videoId: string): Promise<string> {
  let ultimo: Error = new Error("Não consegui transcrever esse vídeo automaticamente.");
  const limite = Date.now() + 110_000; // deixa tempo para a tradução depois
  for (const modelo of MODELOS_GEMINI) {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      if (Date.now() > limite) throw new Error("O Google está demorando demais agora. Tente de novo em alguns minutos.");
      try {
        return await pedirTranscricao(videoId, modelo);
      } catch (e) {
        ultimo = e instanceof Error ? e : ultimo;
        const ocupado = (e as { ocupado?: boolean }).ocupado || (e instanceof Error && e.name === "TimeoutError");
        console.error("Gemini falhou", modelo, tentativa, ultimo.message.slice(0, 200));
        if (!ocupado) throw ultimo; // erro de verdade (vídeo sem fala, chave errada...): não adianta repetir
        if (tentativa === 0) await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
  throw new Error("O Google está sobrecarregado agora. Tente de novo em alguns minutos.");
}

async function pedirTranscricao(videoId: string, modelo: string): Promise<string> {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) throw new Error("A transcrição automática ainda não foi configurada.");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    signal: AbortSignal.timeout(60_000),
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
    console.error("Gemini", modelo, r.status, corpo.slice(0, 400));
    let motivo = "";
    try { const e = JSON.parse(corpo) as { error?: { status?: string; message?: string } }; motivo = `${e.error?.status ?? r.status}: ${e.error?.message ?? ""}`.replace(/(AIza|AQ\.)[\w.-]+/g, "[chave]").slice(0, 200); } catch { motivo = String(r.status); }
    const erro = new Error(`Não consegui transcrever esse vídeo automaticamente (Google: ${motivo}).`) as Error & { ocupado?: boolean };
    erro.ocupado = r.status === 503 || r.status === 429 || r.status === 500 || r.status === 404;
    throw erro;
  }
  const d = JSON.parse(corpo) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const texto = (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  if (!texto || /^SEM FALA/i.test(texto)) throw new Error("Esse vídeo não tem fala para traduzir.");
  return texto;
}
