import "server-only";
import { CRITERIOS, normalizarAvaliacao, type Avaliacao } from "@/lib/avaliar-regras";
import { MAPAS } from "./mapas";

/** Gemini (Google) assiste o vídeo enviado pelo criador (imagem e som) e dá as notas. */
const MODELOS = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"];
const BASE = "https://generativelanguage.googleapis.com";

function chave() {
  const k = process.env.GEMINI_API_KEY?.trim();
  if (!k) throw new Error("A avaliação de vídeo ainda não foi configurada.");
  return k;
}
const semChave = (s: string) => s.replace(/(AIza|AQ\.)[\w.-]+/g, "[chave]").slice(0, 200);

/** Envia o vídeo para o Google em pedaços (cada parte que veio da Supabase vira um pedaço). */
export async function enviarVideo(partes: AsyncIterable<Uint8Array>, tamanho: number, tipo: string): Promise<{ name: string; uri: string }> {
  const ini = await fetch(`${BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": chave(), "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(tamanho), "X-Goog-Upload-Header-Content-Type": tipo, "content-type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "avaliacao-onial" } }),
  });
  const url = ini.headers.get("x-goog-upload-url");
  if (!ini.ok || !url) throw new Error(`Não consegui enviar o vídeo para a IA (Google: ${ini.status} ${semChave(await ini.text())}).`);
  let offset = 0;
  let resposta: Response | null = null;
  for await (const parte of partes) {
    const ultima = offset + parte.byteLength >= tamanho;
    resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Length": String(parte.byteLength), "X-Goog-Upload-Offset": String(offset), "X-Goog-Upload-Command": ultima ? "upload, finalize" : "upload" },
      body: parte as unknown as BodyInit,
    });
    if (!resposta.ok) throw new Error(`O envio do vídeo para a IA falhou (Google: ${resposta.status} ${semChave(await resposta.text())}).`);
    offset += parte.byteLength;
  }
  if (!resposta || offset !== tamanho) throw new Error("O vídeo chegou incompleto. Envie de novo.");
  const d = (await resposta.json()) as { file?: { name: string; uri: string } };
  if (!d.file?.uri) throw new Error("O Google não devolveu o vídeo enviado. Tente de novo.");
  return d.file;
}

/** O Google precisa "processar" o vídeo antes de assistir. */
export async function esperarPronto(name: string, ateMs = 90_000) {
  const fim = Date.now() + ateMs;
  while (Date.now() < fim) {
    const r = await fetch(`${BASE}/v1beta/${name}`, { headers: { "x-goog-api-key": chave() } });
    const d = (await r.json().catch(() => ({}))) as { state?: string };
    if (d.state === "ACTIVE") return;
    if (d.state === "FAILED") throw new Error("O Google não conseguiu abrir esse vídeo. Tente exportar em MP4.");
    await new Promise((ok) => setTimeout(ok, 2500));
  }
  throw new Error("O Google está demorando para preparar o vídeo. Tente de novo em alguns minutos.");
}

export async function apagarVideo(name: string) {
  await fetch(`${BASE}/v1beta/${name}`, { method: "DELETE", headers: { "x-goog-api-key": chave() } }).catch(() => {});
}

const PROMPT = `Você é um editor experiente de YouTube Shorts, TikTok e Reels de Fortnite, e avalia vídeos de criadores brasileiros da equipe Onial ANTES de eles postarem.
Os vídeos divulgam mapas do Fortnite Criativo da Onial: ${MAPAS.map((m) => `"${m.nome}" (${m.temas.join(", ").toLowerCase()})`).join(" e ")}.

Assista ao vídeo inteiro (imagem e som) e dê uma nota de 0 a 10 para cada critério, com um comentário curto e direto (1 ou 2 frases):
${CRITERIOS.map((c) => `- ${c.id}: ${c.nome} — ${c.explica}`).join("\n")}

Seja exigente e honesto, como um bom editor: 10 é raro, 5 é mediano. Elogie o que está bom de verdade.
Depois:
- resumo: 1 ou 2 frases com a opinião geral.
- pontos_fortes: até 3 coisas boas.
- melhorias: até 6 dicas práticas, da que mais aumenta as views para a que menos. Quando a dica for de um momento do vídeo, coloque o tempo no formato m:ss (ex.: "0:03"); se for do vídeo todo, deixe tempo vazio.
Escreva em português do Brasil simples, falando com o criador ("você"). Termos do jogo (build, edit, kill, aim) podem ficar em inglês.

Responda só com JSON neste formato:
{"resumo": "...", "criterios": {${CRITERIOS.map((c) => `"${c.id}": {"nota": 0, "comentario": "..."}`).join(", ")}}, "pontos_fortes": ["..."], "melhorias": [{"tempo": "0:03", "dica": "..."}]}`;

/** Pede a avaliação, trocando de modelo se um estiver sobrecarregado. */
export async function avaliarVideo(uri: string, tipo: string, ateMs = 150_000): Promise<{ dados: Avaliacao; tokensEntrada: number; tokensSaida: number; custoUsd: number }> {
  const fim = Date.now() + ateMs;
  let ultimo: Error = new Error("A IA não conseguiu avaliar agora. Tente de novo.");
  for (const modelo of MODELOS) {
    if (Date.now() > fim - 20_000) break;
    try {
      const r = await fetch(`${BASE}/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        signal: AbortSignal.timeout(Math.max(20_000, fim - Date.now())),
        headers: { "content-type": "application/json", "x-goog-api-key": chave() },
        body: JSON.stringify({ contents: [{ parts: [{ file_data: { file_uri: uri, mime_type: tipo } }, { text: PROMPT }] }], generationConfig: { responseMimeType: "application/json" } }),
      });
      const corpo = await r.text();
      if (!r.ok) {
        console.error("Gemini avaliar", modelo, r.status, corpo.slice(0, 300));
        ultimo = new Error(`A IA não conseguiu avaliar agora (Google: ${r.status}).`);
        if ([429, 500, 503, 404].includes(r.status)) continue;
        throw ultimo;
      }
      const d = JSON.parse(corpo) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } };
      const texto = (d.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").replace(/^```(json)?|```$/g, "").trim();
      const dados = normalizarAvaliacao(JSON.parse(texto));
      if (!dados.resumo && !dados.melhorias.length) throw new Error("A IA devolveu uma avaliação vazia. Tente de novo.");
      const entrada = d.usageMetadata?.promptTokenCount ?? 0;
      const saida = (d.usageMetadata?.candidatesTokenCount ?? 0) + (d.usageMetadata?.thoughtsTokenCount ?? 0);
      // estimativa do preço do Gemini Flash (US$ por milhão de tokens)
      return { dados, tokensEntrada: entrada, tokensSaida: saida, custoUsd: (entrada * 0.5 + saida * 3) / 1e6 };
    } catch (e) {
      ultimo = e instanceof Error ? e : ultimo;
      if (e instanceof Error && e.name !== "TimeoutError" && !(e instanceof SyntaxError) && !/Google: (429|500|503|404)/.test(e.message)) throw e;
    }
  }
  throw ultimo;
}
